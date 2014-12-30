var assert = require('assert'),
  fs = require('fs'),
  net = require('net'),
  path = require('path'),
  assert = require('chai').assert,
  protocol = require('./_protocolSimulator'),
  mpdBuffer = require('../lib/mpdbuffer');


describe('mpd buffer', function() {

  var port = 4991;
  var host = 'localhost';

  var server;
  var socket;

  beforeEach(function() {
    //reset the simulations
    simulations = {};
  });

  before(function() {
    server = null;
    simulations = {};
    server = net.createServer();
    server.listen(port);

    server.on('connection', function(s) {
      s.write(protocol['connect']);

      if (simulations[0]) {
        if (simulations[0].data1) {
          s.write(simulations[0].data1);
        }

        if (simulations[0].data2) {
          var timer = setTimeout(function() {
            s.write(simulations[0].data2);
          }, 500);
        }
      }

      s.on('data', function(d) {
        //commands might be be buffered up.
        var commandList = d.toString().split('\n');

        for (var c in commandList) {
          if (commandList[c].trim() === '') continue;

          var command = commandList[c].replace(/(\r\n|\n|\r)/gm, "");
          if (command.indexOf(' ') > 0)
            command = command.split(' ')[0];

          //console.log('received: %s', command);
          if (simulations[command]) {
            var sleep = simulations[command].sleep;
            var response = simulations[command].data;

            setTimeout(function() {
              s.write(response);
            }, sleep);
          }
        }
      });
    });
  });

  after(function() {
    try {
      socket.destroy();
      socket = null;
    } catch (e) {}
    try {
      server.close();
      server = null;
    } catch (e) {}
  });

  var simulations = {};

  function simulate(event, result, sleep) {
    var protocolSample = result || event;
    sleep = 0 || sleep;

    if (protocol[protocolSample + "1"]) {
      simulations[0] = {
        data1: protocol[protocolSample + "1"].slice(0),
        data2: protocol[protocolSample + "2"].slice(0),
        sleep: sleep
      };
    } else {
      simulations[0] = {
        data1: protocol[protocolSample].slice(0),
        sleep: sleep
      };
    }


  }

  it('emits the ready event with the version', function(done) {
    //simulate('currentsong');

    var client = net.connect({
        port: port
      }),
      buffer = mpdBuffer.connect(client);

    buffer.on('message', function(message) {
      console.log(message);
      done(new Error('should not be called'));
    });

    buffer.on('error', function(err) {
      done(new Error('should not be called'));
    });

    buffer.on('ready', function(version) {
      assert.equal('0.17.0', version);
      done();
    });
  });


  it('emits an error', function(done) {
    simulate('unknowncommand');

    var client = net.connect({
        port: port
      }),
      buffer = mpdBuffer.connect(client);

    buffer.on('message', function(message) {
      console.log(message);
      done(new Error('should not be called'));
    });

    buffer.on('error', function(err) {
      assert.equal('ACK [5@0] {} unknown command "js"', err);
      done();
    });
  });


  it('can buffer partial playlist', function(done) {
    simulate('partialresponse');

    var client = net.connect({
        port: port
      }),
      buffer = mpdBuffer.connect(client);

    buffer.on('message', function(message) {
      assert.isArray(message);
      assert.equal(message.length, 10);
      done();
    });
  });

  it('can buffer partial status', function(done) {
    simulate('partialstatus');

    var client = net.connect({
        port: port
      }),
      buffer = mpdBuffer.connect(client);

    buffer.on('message', function(message) {
      assert.isArray(message);
      assert.equal(message.length, 16);
      done();
    });
  });

  it('can buffer broken mid line stream', function(done) {
    simulate('lineending');

    var client = net.connect({
        port: port
      }),
      buffer = mpdBuffer.connect(client);

    buffer.on('message', function(message) {
      //console.log(message)
      assert.isArray(message);
      assert.equal(2, message.length);

      assert.equal(message[0], '0:file: Skrillex/Skrillex - Weekends!!! (feat. Sirah)/01 Weekends!!!.mp3')
      assert.equal(message[1], '1:file: Skrillex/Kaskade & Skrillex - Lick It (Kaz James Remix)/01 Lick It (Kaz James Remix).mp3')
      done();
    });

  });

});