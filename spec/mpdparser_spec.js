var assert = require('assert'),
  fs = require('fs'),
  net = require('net'),
  path = require('path'),
  assert = require('chai').assert,
  protocol = require('./_protocolSimulator'),
  mpdParser = require('../lib/mpdparser');


describe('mpd parser', function() {

  it('parses an error message', function(){
    var command = 'songdoesnotexist';
    var buffer = protocol[command];
    var result = mpdParser.parseError(buffer);

    assert.deepEqual(result, {
      code: '50',
      command: 'play',
      command_list_num: '1',
      message: 'song doesn\'t exist: "10240"',
      original: "ACK [50@1] {play} song doesn't exist: \"10240\"\n"
    });
  });

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

    //console.log(result);

    assert.isArray(result);
    assert.equal(result.length, 7);
    assert.property(result[0], 'plugin');
    assert.property(result[0], 'suffix');
    assert.property(result[0], 'mime_type');
    assert.isArray(result[0].suffix);
    assert.isArray(result[0].mime_type);

  });

  it('parses a listall reponse with directories', function() {
    var command = 'listall';
    var buffer = protocol[command];
    var result = mpdParser.parse(command, buffer);

    assert.isArray(result);
    assert.equal(result.length, 33); //33 directories

    //reduce to just files
    var files = result.reduce(function(acc, curr){
      //console.log(acc);
      if(curr.hasOwnProperty('file'))
        acc = acc.concat(curr['file']);
      return acc;
    }, []);

    //reduce to just directories
    var directories = result.reduce(function(acc, curr){
      //console.log(acc);
      if(curr.hasOwnProperty('directory'))
        acc.push(curr['directory']);
      return acc;
    }, []);

    assert.equal(files.length, 188);
    assert.equal(directories.length, 33);
  });

});