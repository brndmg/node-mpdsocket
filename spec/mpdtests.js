var assert = require('assert'),
  fs = require('fs'),
  net = require('net'),
  path = require('path'),
  assert = require('chai').assert,
  protocol = require('./_protocolSimulator'),
  mpdSocket = require('../mpdsocket');


describe('mpd', function() {
  var port = 4990;
  var host = 'localhost';

  var server;
  var socket;

  before(function() {
    server = null;
    simulations = {};
    server = net.createServer();
    server.listen(port);

    server.on('connection', function(s) {
      s.write(protocol['connect']);

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

    simulations[event] = {
      data: protocol[protocolSample].slice(0),
      sleep: sleep
    };
  }

  it('should connect and get the version number', function(done) {
    var serverConnected = false;
    var clientConnected = false;
    server.on('connection', function(s) {
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

  it('should be able to fetch status', function(done) {
    simulate('status');

    socket = new mpdSocket('localhost', port);

    socket.send('status', function(err, res) {
      assert.equal(res.volume, '60');
      assert.equal(res.consume, '0');

      res.volume = 'sipper';

      done();
    });
  });

  it('should be able to get a playlist with a single song', function(done) {
    simulate('playlistinfo', 'playlistinfo_onesong');

    socket = new mpdSocket('localhost', port);

    socket.send('playlistinfo', function(err, result) {
      if (err) console.log(err);

      //console.log(result);
      assert.equal(result.length, 1);
      assert.equal(result[0].volume, undefined);
      done();
    });
  });

  it('should be able to get the playlist', function(done) {
    simulate('playlistinfo');

    socket = new mpdSocket('localhost', port);

    socket.send('playlistinfo', function(err, result) {
      if (err) console.log(err);

      assert.equal(result.length, 2);
      assert.equal(result[0].volume, undefined);
      done();
    });
  });

  it.skip('can get an empty playlist', function(done) {
    simulate('playlistinfo', 'noresults');

    socket = new mpdSocket('localhost', port);

    socket.send('playlistinfo', function(err, result) {
      if (err) console.log(err);

      console.log(result);

      assert.isArray(result, 'result is not an array');
      assert.equal(result.length, 0);
      assert.equal(result[0].volume, undefined);
      done();
    });

  });

  it.only('should be able to listall', function(done) {
    simulate('listall');

    socket = new mpdSocket('localhost', port);

    socket.send('listall', function(err, result) {
      if (err) console.log(err);

      var directories = result.filter(function(item) {
        return item.hasOwnProperty('directory') && !item.hasOwnProperty('file');
      });

      //console.log(result);

      assert.equal(directories.length, 33);
      assert.equal(result.length, 221);
      assert.equal(result[0].volume, undefined);
      done();
    });
  });

  it('should be able to search', function(done) {
    simulate('search');

    socket = new mpdSocket('localhost', port);

    socket.send('search artist skrillex', function(err, result) {
      if (err) console.log(err);

      assert.equal(result.length, 33);
      assert.equal(result[0].volume, undefined);
      done();
    });
  });

  it('should be able to handle multiple commands', function(done) {
    simulate('status', 'status', 100);
    simulate('listall');

    socket = new mpdSocket('localhost', port);

    var count = 0;

    isDone = function() {
      count += 1;
      if (count >= 2)
        done();
    };

    socket.send('status', function(err, res) {
      //console.log('hello 1: status');
      assert.property(res, 'volume');

      isDone();
    });

    socket.send('listall', function(err, res) {
      //console.log('hello 2: listall');

      assert.equal(221, res.length);

      isDone();
    });
  });

});