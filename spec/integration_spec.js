var assert = require('assert'),
  fs = require('fs'),
  net = require('net'),
  path = require('path'),
  assert = require('chai').assert,
  protocol = require('./_protocolSimulator'),
  mpdSocket = require('../mpdsocket');

describe.skip('integration test', function() {
  it('should connect', function(done) {
    var mpd = new mpdSocket('127.0.0.1', 6600, {
      debug: true
    });

    mpd.on('connect', function() {
      // mpd.send('status', function(err, res) {
      //   //console.log(res);
      //   //done();
      // });

      mpd.send('listall', function(err, res) {
        //console.log(res);

        // var result = res.filter(function(item){ return item.hasOwnProperty('file');}).map(function(item){
        //   item.url = encodeURIComponent(item.file);
        //   return item;
        // });

        // result.forEach(function(item){
        //   assert.equal(item.file, decodeURIComponent(item.url));
        // });

        //console.log(result[1]);

        done();
      });
    });
  });
});

describe.skip('scratch', function() {

  it('can find the index of OK in a string', function() {
    var okPattern = /^OK/m;

    var lineEnding1 = protocol['lineending1'];

    //console.log(lineEnding1)

    var match = okPattern.exec(lineEnding1);

    console.log('lineending1: ', match);

    var buffer = lineEnding1 + protocol['lineending2'];

    console.log(buffer)

    if((match = buffer.match(okPattern)) !== null ) {
      var input = buffer.substring(0, match.index);
      console.log(input);
    }


    console.log('lineending2: ', match);
  });

});