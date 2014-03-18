var assert = require('assert'),
    fs = require('fs'),
    net = require('net'),
    path = require('path'),
    assert = require('chai').assert,
    protocol = require('./_protocolSimulator'),
    mpdSocket = require('../mpdsocket');

describe.skip('integration test', function(){
  it('should connect', function(done){
    var mpd = new mpdSocket();

    mpd.on('connect', function(){
      mpd.send('status', function(err, res){
        //console.log(res);

      });

      mpd.send('playlistinfo', function(err, res){
        console.log(res[0]);
        
        var result = res.map(function(item){
          item.url = encodeURIComponent(item.file);
          return item;
        });

        result.forEach(function(item){
          assert.equal(item.file, decodeURIComponent(item.url));
        });

        done();
      });
    });
  });
});