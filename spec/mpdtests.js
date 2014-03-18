var assert = require('assert'),
    fs = require('fs'),
    net = require('net'),
    path = require('path'),
    assert = require('chai').assert,
    protocol = require('./_protocolSimulator'),
    mpdSocket = require('../mpdsocket');


describe('mpd', function(){
	var port = 4999;
	var host = 'localhost';

	 var server;
  var socket;

  beforeEach(function() {
    server = net.createServer();
    server.listen(port);
    //socket = new EverSocket({ type: 'tcp4', reconnectWait: 1 });
  });

  afterEach(function() {
    try {
      socket.destroy();
    } catch(e) {}
    try {
      server.close();
    } catch(e) {}
  });

  it('should connect and get the version number', function(done){
    var serverConnected = false;
    var clientConnected = false;
    server.on('connection', function(s) {
      s.write(protocol['connect']);
      serverConnected = true;
    });

    socket = new mpdSocket('localhost', port);
    socket.on('connect', function() {
      clientConnected = true;
    });

    setTimeout(function() {
      assert.isTrue(serverConnected);
      assert.isTrue(clientConnected);
      assert.equal(socket.version, '0.17.0');
      done();
    }, 10);
  });




});