//var PATTERN = /^([\w|\-]+):\s?(.*)$/i;
var PATTERN = /^(?:[0-9]*?:)?([\w|\-]+):\s?(.*)$/i;

function match(line) {
  return line.match(PATTERN);
}

function valid(match) {
  return match;
}

function matches(buffer) {

  var arr = buffer;
  if(!(arr instanceof Array))
    arr = arr.split('\n');

  return arr.map(match).filter(valid);
}

String.prototype.toCamel = function() {
  return this
    .replace(/[-]/g, ' ')
    .replace(/\s(.)/g, function($1) {
      return $1.toUpperCase();
    })
    .replace(/\s/g, '')
    .replace(/^(.)/, function($1) {
      return $1.toLowerCase();
    });
};

var kvDecoder = function(buffer) {
  return matches(buffer).reduce(function(acc, match) {
    acc[match[1].toCamel()] = match[2];
    return acc;
  }, {});
};



// Decodes 'key: value [...]' to 'list of value [...]',
// effectively dropping all keys.
var arrayDecoder = function(buffer) {
  return matches(buffer).reduce(function(acc, match) {
    acc.push(match[2]);
    return acc;
  }, []);
};

var kvListDecoder = function(head, exclusions) {
  exclusions = exclusions || [];

  return function(buffer) {
    return matches(buffer).
    reduce(function(acc, match) {
      if (match[1] === head) {
        acc.index += 1;
        acc.array[acc.index] = {};
      }

      if(exclusions.indexOf(match[1]) == -1){
        acc.array[acc.index][match[1].toCamel()] = match[2];  
      }

      return acc;
    }, {
      index: -1,
      array: []
    }).
    array;
  };
};

var kvGroupsDecoder = function(tags, exclusions, subgroups) {
  exclusions = exclusions || [];

  return function(buffer) {
    return matches(buffer).
    filter(function(match) {
      return exclusions.indexOf(match[1]) === -1;
    }).
    reduce(function(acc, match) {

      //is the current property in the list of tags
      if (tags.indexOf(match[1]) !== -1) {
        //if so, start an object
        acc.index += 1;
        acc.array[acc.index] = {};
      }

      if(subgroups.indexOf(match[1]) !== -1){
        //repeated items should be added to an array
        if(acc.array[acc.index][match[1]])
          acc.array[acc.index][match[1]].push(match[2]);
        else
          acc.array[acc.index][match[1]] = [match[2]];
      }else{
        acc.array[acc.index][match[1]] = match[2];
      }

      return acc;
    }, {
      index: -1,
      array: []
    }).
    array;
  };
};

var parsers = {
  'list': {
    parse: function(buffer) {
      return arrayDecoder(buffer);
    }
  },
  'search': {
    parse: function(buffer) {
      return kvListDecoder('file')(buffer);
    }
  },
  'playlistinfo': {
    parse: function(buffer) {
      return kvListDecoder('file')(buffer);
    }
  },
  'playlist': {
    parse: function(buffer) {
      return kvListDecoder('file')(buffer);
    }
  },
  'decoders': {
    parse: function(buffer){
      return kvGroupsDecoder(['plugin'],[], ['suffix', 'mime_type'])(buffer);
    }
  },
  'listall':{
    parse: function(buffer){
       return kvGroupsDecoder(['directory'],[], ['file'])(buffer);
    }
  }
}

module.exports.parsers = parsers;

module.exports.parse = function(command, buffer) {
  command = command.split(' ')[0];

  if (parsers[command])
    return parsers[command].parse(buffer);
  else {
    //console.log('parser for "%s" command not registered', command);
    return kvDecoder(buffer);
  }
}

module.exports.parseError = function(errorMessage){
  
  var match = errorMessage.match(/^ACK\s+\[(.*?)@(\d+)\](?:\s+\{(.*?)\})?\s+(.*)/);

  return {
    code: match[1],
    command_list_num: match[2],
    command: match[3],
    message: match[4],
    original: errorMessage
  };

}
