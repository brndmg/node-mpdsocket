var PATTERN = /^([\w|\-]+):\s?(.*)$/i;

function match(line) {
  return line.match(PATTERN);
}

function valid(match) {
  return match;
}

function matches(buffer) {
  return buffer.
  map(match).
  filter(valid);
}

module.exports.kvDecoder = function(buffer) {
  return matches(buffer).reduce(function(acc, match) {
    acc[match[1]] = match[2];
    return acc;
  }, {});
};

// Decodes 'key: value [...]' to 'list of value [...]',
// effectively dropping all keys.
module.exports.arrayDecoder = function(buffer) {
  return matches(buffer).reduce(function(acc, match) {
    acc.push(match[2]);
    return acc;
  }, []);
};

module.exports.kvListDecoder = function(head) {
  return function(buffer) {
    return matches(buffer).
    reduce(function(acc, match) {
      if (match[1] === head) {
        acc.index += 1;
        acc.array[acc.index] = {};
      }

      acc.array[acc.index][match[1]] = match[2];
      return acc;
    }, {
      index: -1,
      array: []
    }).
    array;
  };
};

module.exports.kvGroupsDecoder = function(tags, exclusions) {
  return function(buffer) {
    return matches(buffer).
    filter(function(match) {
      return exclusions.indexOf(match[1]) === -1;
    }).
    reduce(function(acc, match) {
      if (tags.indexOf(match[1]) !== -1) {
        acc.index += 1;
        acc.array[acc.index] = {};
      }

      acc.array[acc.index][match[1]] = match[2];
      return acc;
    }, {
      index: -1,
      array: []
    }).
    array;
  };
};