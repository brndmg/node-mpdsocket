var assert = require('assert'),
  fs = require('fs'),
  net = require('net'),
  path = require('path'),
  assert = require('chai').assert,
  protocol = require('./_protocolSimulator'),
  mpdParser = require('../lib/mpdparser');


describe.only('parser', function() {

  it('parses current song as object', function() {
    var command = 'currentsong';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);

    assert.isObject(result);
    assert.property(result, 'file');
    assert.property(result, 'pos');
    assert.property(result, 'id');
    assert.property(result, 'title');

  });

  it('parses status as object', function() {
    var command = 'status';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isObject(result);
    assert.property(result, 'volume');
    assert.property(result, 'repeat');
    assert.property(result, 'song');
    assert.property(result, 'audio');
  });


  it('parses a list of genres as array', function() {
    var command = 'list genre';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);
    //console.log(result);

    assert.isArray(result);
    assert.equal(6, result.length);
  });

  it('parses a search result as array of objects', function() {
    var command = 'search';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isArray(result);
    assert.equal(33, result.length);
  });

  it('parses playlistinfo as array of objects', function() {
    var command = 'playlistinfo';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);
    //console.log(result);

    assert.isArray(result);
    assert.equal(2, result.length);
    assert.property(result[0], 'file');
  });

  it('parses playlist as simple array of strings', function() {
    var command = 'playlist';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isArray(result);
    assert.equal(34, result.length);
    assert.property(result[0], 'file')
  });

  it('parses an empty reponse', function() {
    var command = 'play';
    var buffer = protocol['noresults'];
    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isObject(result);
    assert.deepEqual(result, {});
  });

  it('parses a count reponse', function() {
    var command = 'count_genre_Dance';
    var buffer = protocol[command];

    //console.log(buffer);

    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isObject(result);
    assert.property(result, 'playtime');
    assert.property(result, 'songs');
  });

  it('can also parse an array buffer', function() {
    var command = 'count_genre_Dance';
    var buffer = protocol[command].split('\n');

    assert.isArray(buffer);

    var result = mpdParser.parse(command, buffer);

    //console.log(result);

    assert.isObject(result);
    assert.property(result, 'playtime');
    assert.property(result, 'songs');
  });

  it('can also parse decoders command', function() {
    var command = 'decoders';
    var buffer = protocol[command];

    var result = mpdParser.parse(command, buffer);

    console.log(result);

    assert.isObject(result);
    assert.property(result, 'playtime');
    assert.property(result, 'songs');
  });

});