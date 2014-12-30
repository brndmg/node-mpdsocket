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

var isDebugMode = false;

function mpdSocket(host, port, options) {
  var self = this;
  this.host = host || "localhost";
  this.port = port || 6600;

  var options = options || {};
  isDebugMode = options.debug || false;

  this.maxRetryAttempts = options.maxRetryAttempts || this.maxRetryAttempts;
  this.reconnectWaitTime = options.reconnectWaitTime || this.reconnectWaitTime;

  log('constructor: opening');

  self.open(self.host, self.port);
}

var log = function() {
  if (isDebugMode) {
    arguments[0] = 'mpd: ' + arguments[0];
    console.log.apply(this, Array.prototype.slice.call(arguments));
  }
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

  waitingTime: 100,
  reconnectWaitTime: 1000,
  maxRetryAttempts: 0,
  retryAttempt: 0,


  handleBufferedMessage: function(buffer) {
    var cb = this.callbacks.shift();
    var parsedMessage = mpdParser.parse(cb.command, buffer);
    log('handling callback for: %s', cb.command);
    cb.callback(null, parsedMessage);
    this.waiting = false;
  },

  handleErrorResult: function(err) {
    var cb = this.callbacks.shift();
    cb.callback(new Error(err), null);
    this.socket.destroy();
    this.waiting = false;
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
        reconnectWait: self.reconnectWaitTime
      });

      self.buffer = mpdBuffer.connect(this.socket);

      self.buffer.on('message', function(message) {
        log("handling message: %s lines", message.length);
        self.handleBufferedMessage.call(self, message);
        self._send(); //send the next one.
      });

      self.buffer.on('error', function(err) {
        //handles error messages from MPD.
        var error = mpdParser.parseError(err);
        var cb = self.callbacks.shift();
        cb.callback(error, null);
      });

      self.buffer.on('ready', function(version) {
        //this event is emitted when the buffer recieves
        // the version from the mpd service, when a connection is made.
        log('buffer ready');
        self.version = version;
      });

      //** SOCKET EVENTS **//
      self.socket.addListener('end', function() {
        log('disconnected - internal');
        self.isOpen = false;
      });

      self.socket.addListener('close', function() {
        self.isOpen = false;
        self.waiting = true;
        log('closed - internal');
      });

      self.socket.addListener('reconnect', function() {
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
        self.waiting = false;
        self._send();
      });

      self.socket.addListener('timeout', function() {
        self.isOpen = false;
        log('timeout - internal');
      });


      //Connect!
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
      if (self.retryAttempt >= self.maxRetryAttempts && self.maxRetryAttempts !== 0) {
        log('ERROR: maxRetryAttempts reached: %s', self.retryAttempt);
        self.handleErrorResult('maxRetryAttempts: ' + self.retryAttempt);
      } else {
        log('waiting for previous results. retry(%s)', self.retryAttempt);
        setTimeout(function() {
          self.retryAttempt++;
          self._send()
        }, self.waitingTime); //try again after a few ms.
      }
    } else {
      if (self.commands.length != 0) {
        var command = self.commands.shift();
        self.lastCommandId = command.id;
        log('writing command: %s', command.cmd);
        self.socket.write(command.cmd + "\n");
        self.waiting = true;
        self.retryAttempt = 0;
      }
    }

  },

  connectionIsReady: function() {
    return this.isOpen || this.connecting || this.waiting;
  },

  clearQueue: function() {
    this.callbacks.length = 0;
    this.commands.length = 0;
  },

  enqueueRequest: function(req, callback) {
    log('enqueing: %s', req);
    var id = crypto.randomBytes(20).toString('hex');
    this.callbacks.push({
      'command': req,
      'callback': callback,
      'id': id
    });
    this.commands.push({
      'cmd': req,
      'id': id
    });
  },

  send: function(req, callback) {
    callback = callback || (function() {
      log('dummy callback');
    });

    if (this.connectionIsReady()) {
      this.enqueueRequest(req, callback);
      if (this.commands.length == 1) this._send();
    } else {
      var self = this;
      this.open(this.host, this.port);
      this.once('connect', function() {
        log('send - connected');
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