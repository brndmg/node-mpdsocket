/*******
 ** node-mpdsocket :: an MPD library for node.js
 **
 ** author: Eli Wenig (http://eliwenig.com/) <eli@csh.rit.edu>
 **
 ** copyright (c) 2011 Eli Wenig
 ** made available under the MIT license
 **   http://www.opensource.org/licenses/mit-license.php
 **
 *******/

var net = require('net');
var sys = require('sys');

function mpdSocket(host, port) {
  this.host = host || "localhost";
  this.port = port || 6600;

  this.open(this.host, this.port);
}

var log = function() {
  //console.log.apply(this, Array.prototype.slice.call(arguments) );
};

mpdSocket.prototype = {
  callbacks: [],
  commands: [],
  isOpen: false,
  socket: null,
  version: "0",
  host: null,
  port: null,
  data: "",
  response: {},
  responses: [],
  waiting: false,

  handleData: function(datum) {
    this.data += datum;
    lines = this.data.split("\n");
    this.responses = [];
    this.response = {};

    // Put back whatever's after the final \n for next time
    this.data = lines.pop();
    if (this.data.length > 0) log('DATA: %s', this.data);

    var match;
    for (var l in lines) {
      var line = lines[l];

      log("LINE[%s of %s]: %s", 1 + parseInt(l), lines.length, line);

      if (match = line.match(/^ACK\s+\[.*?\](?:\s+\{.*?\})?\s+(.*)/)) {
        this.waiting = false;
        this.callbacks.shift().callback(match[1], null);
      } else if (line.match(/^OK MPD/)) {
        this.version = lines[l].split(' ')[2];
      } else if (line.match(/^OK/)) {
      	//end of a message stream;

        //if objects are being returned or the current response being built has a 'file' property.
        if (this.responses.length > 0 || this.response.hasOwnProperty('file')) {

          //handle multiple object response
          if (typeof(this.response) == 'string' || Object.keys(this.response).length > 0) {
            this.responses.push(this.response);
          }

          //handle multiple objects
          cb = this.callbacks.shift();
          cb.callback(null, this.responses);
        } else {
          //handle single objects
          cb = this.callbacks.shift()
          cb.callback(null, this.response);
        }

        //change the state of the connection
        this.waiting = false;
      } else {
      	//build the objects
        // Matches 'key: val' or 'val'
        match = line.match(/^(?:(.*?):)?\s*(.*?)\s*$/)
        var key = match[1];
        var value = match[2];

        // New response if old response was a string or had this key defined already
        if (typeof(this.response) == 'string' || typeof(this.response[key]) != 'undefined') {
          this.responses.push(this.response);
          this.response = {};
        }

        if (typeof(key) == 'undefined') {
          this.response = value;
        } else if (key == 'directory') {
          //push the old entry if it is not empty
          if (Object.keys(this.response).length > 0) {
            this.responses.push(this.response);
            this.response = {};
          }
          this.response[key] = value;
          //push the directory entry
          this.responses.push(this.response);
          this.response = {};
        } else {
          this.response[key] = value;
        }
      }
    }
  },

  on: function(event, fn) {
    this.socket.on(event, fn);
  },

  open: function(host, port) {
    var self = this;
    if (!(this.isOpen)) {
      this.socket = net.createConnection(port, host);
      this.socket.setEncoding('UTF-8');
      this.socket.addListener('connect', function() {
        self.isOpen = true;
      });
      this.socket.addListener('data', function(data) {
        self.handleData.call(self, data);
        self._send();
      });
      this.socket.addListener('end', function() {
        self.isOpen = false;
      });
    }
  },

  _send: function() {
    var self = this;
    if (self.waiting) {
      setTimeout(function() {
        self._send()
      }, 100); //try again after a few ms.
    } else {
      if (self.commands.length != 0) self.socket.write(self.commands.shift() + "\n");
      self.waiting = true;
    }

  },

  send: function(req, callback) {
    if (this.isOpen) {
      this.callbacks.push({
        'command': req,
        'callback': callback
      });
      this.commands.push(req);
      if (this.commands.length == 1) this._send();
    } else {
      var self = this;
      this.open(this.host, this.port);
      this.on('connect', function() {
        self.send(req, callback);
      });
    }
  }
}

module.exports = mpdSocket;