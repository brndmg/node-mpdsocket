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
var mpdBuffer = require('./lib/mpdbuffer');
var mpdParser = require('./lib/mpdparser');
var EverSocket = require('eversocket').EverSocket;
var crypto = require('crypto');

function mpdSocket(host, port) {
  this.host = host || "localhost";
  this.port = port || 6600;

  log('constructor: opening');

  var self = this;

  // process.nextTick(function() {
  //   log('next tick');
  //   self.open(self.host, self.port);
  // });

  self.open(self.host, self.port);
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
  buffer: null,

  waiting: false, //used to wait for a response, to ensure callbacks are called in the same order.
  connecting: false,
  lastCommandId: undefined,

  handleBufferedMessage: function(buffer) {
    var cb = this.callbacks.shift();
    var parsedMessage = mpdParser.parse(cb.command, buffer);
    cb.callback(null, parsedMessage);
  },

  on: function(event, fn) {
    this.socket.on(event, fn);
  },

  once: function(event, fn) {
    this.socket.once(event, fn);
  },

  open: function(host, port) {
    var self = this;
    if (!(this.isOpen) && !(this.connecting)) {
      self.connecting = true;
      log('opening connection');
      this.socket = new EverSocket({
        type: 'tcp4',
        reconnectOnTimeout: true,
        reconnectWait: 1000
      });

      //this.socket = net.createConnection(port, host);
      //this.socket.setEncoding('UTF-8');
      // this.socket.addListener('connect', function() {

      //   self.isOpen = true;
      //   log('connected: %s', self.isOpen);
      // });

      self.buffer = mpdBuffer.connect(this.socket);

      self.buffer.on('message', function(message) {
        self.handleBufferedMessage.call(self, message);
        self._send(); //send the next one.
      });

      self.buffer.on('error', function(err) {
        var error = mpdParser.parseError(err);
        var cb = self.callbacks.shift();
        self.waiting = false;
        cb.callback(error, null);
      });

      self.buffer.on('ready', function(version) {
        self.waiting = false;
        self.version = version;
      });


      self.socket.addListener('end', function() {
        log('disconnected - internal');
        self.isOpen = false;
      });

      self.socket.on('close', function() {
        self.isOpen = false;
        log('closed - internal');
      });

      self.socket.on('reconnect', function() {
        log('reconnected - internal');
        //flush the corresponding callback
        if (self.commands.length !== self.callbacks.length) {
          var elementPos = self.callbacks.map(function(x) {
            return x.id;
          }).indexOf(self.lastCommandId);
          log('removing stale callback');
          self.callbacks.splice(elementPos, 1)
        }
        self.isOpen = true;
      });

      self.socket.on('timeout', function() {
        self.isOpen = false;
        log('timeout - internal');
      });


      log('connecting - internal');
      self.socket.connect(this.port, this.host, function() {
        log('connected - internal');
        self.isOpen = true;
        self.connecting = false;
      });


    }
  },

  _send: function() {
    var self = this;
    if (self.waiting) {
      log('waiting');
      setTimeout(function() {
        self._send()
      }, 100); //try again after a few ms.
    } else {
      if (self.commands.length != 0) {
        log('sending command');
        var command = self.commands.shift();
        self.lastCommandId = command.id;
        self.socket.write(command.req + "\n");
        self.waiting = true;
      }
    }

  },

  send: function(req, callback) {
    callback = callback || (function() {
      log('dummy');
    });

    log('send: %s', this.isOpen);
    if (this.isOpen || this.connecting || this.waiting) {
      var id = crypto.randomBytes(20).toString('hex');
      this.callbacks.push({
        'command': req,
        'callback': callback,
        'id': id
      });
      this.commands.push({
        'req': req,
        'id': id
      });
      if (this.commands.length == 1) this._send();
    } else {
      var self = this;
      this.open(this.host, this.port);
      this.once('connect', function() {
        self.isOpen = true;
        self.send(req, callback);
      });
    }
  },

  destroy: function() {
    this.socket.destroy();
  },

  cancel: function() {
    this.socket.cancel();
  }
}

module.exports = mpdSocket;