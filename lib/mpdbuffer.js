"use strict";
var events = require('events'),
  util = require('util'),
  MSG_BOUNDARY = /^(OK|ACK|list_OK)(.*)$/m,
  OK_MPD = /^OK MPD /,

  mpdbuffer = function(stream) {
    events.EventEmitter.call(this);

    var self = this,
      buffer = '';


    stream.on('data', function(data) {
      buffer += data;
      var match;

      //buffer the entire message until the conditions are met.
      //thanks to: https://github.com/andrewrk/mpd.js for the buffering code.
      while ((match = buffer.match(MSG_BOUNDARY))) {
        var input = buffer.substring(0, match.index),
          line = match[0],
          code = match[1];
        if (code === 'ACK') {
          self.emit('error', line);
        } else if (OK_MPD.test(line)) {
          self.emit('ready', line.split(' ')[2]);
        } else {
          //remove blank lines
          self.emit('message', input.replace(/^\s+|\s+$/g, '').split('\n'));
        }
        buffer = buffer.substring(input.length + line.length + 1);
      }
    });
  };

util.inherits(mpdbuffer, events.EventEmitter);

exports.mpdbuffer = mpdbuffer;

exports.connect = function(stream) {
  stream.setEncoding('utf-8');
  return new mpdbuffer(stream);
};