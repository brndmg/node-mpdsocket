"use strict";

var events = require('events'),
  util = require('util'),

  mpdbuffer = function(stream) {
    events.EventEmitter.call(this);

    var self = this,
      buffer = [];

    stream.on('data', function(data) {
      //handle the mpd data and emit events;
      var lines = data.split("\n");

      var match;
      for (var l in lines) {
        var line = lines[l];

        if (line.trim() === '') continue;

        if (match = line.match(/^ACK\s+\[.*?\](?:\s+\{.*?\})?\s+(.*)/)) {
          self.emit('error', match[1]);
        } else if (line.match(/^OK MPD/)) {
          self.emit('ready', lines[l].split(' ')[2]);
        } else if (line.match(/^OK/)) {
          self.emit('message', buffer);
          buffer = [];
        }else{
          buffer.push(line);
        }
      }
    });
  };

util.inherits(mpdbuffer, events.EventEmitter);

exports.mpdbuffer = mpdbuffer;

exports.connect = function(stream) {
  stream.setEncoding('utf-8');
  return new mpdbuffer(stream);
};