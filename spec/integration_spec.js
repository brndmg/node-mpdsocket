var assert = require('assert'),
    fs = require('fs'),
    net = require('net'),
    path = require('path'),
    assert = require('chai').assert,
    protocol = require('./_protocolSimulator'),
    mpdSocket = require('../mpdsocket');

describe.only('integration test', function(){
  it('should connect', function(done){
    var mpd = new mpdSocket();

    mpd.on('connect', function(){
      mpd.send('playlistinfo', function(err, res){
        console.log(res);
        done();
      });
    });
  });
});