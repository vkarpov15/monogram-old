'use strict';

var _ = require('lodash');
var N = require('nested-observe');
var defineMethod = require('./utils').defineMethod;

function Document(obj, isNew) {
  var delta = { $set: {}, $unset: {} };
  var state = {};
  var observer = _createObserver(obj, delta, state);
  var ignoredPaths = {};

  defineMethod(obj, '$apply', function() {
    N.deliverChangeRecords(observer);
  });

  defineMethod(obj, '$delta', function() {
    obj.$apply();
    return delta;
  });

  defineMethod(obj, '$ignore', function(fn) {
    state.ignore = true;
    fn();
    obj.$apply();
    state.ignore = false;
  });

  defineMethod(obj, '$ignorePath', function(path, shouldIgnore) {
    if (arguments.length === 1) {
      let components = path.split('.');
      let tree = ignoredPaths;
      for (let i = 0, length = components.length; i < length; ++i) {
        tree = tree[components[i]];
        if (tree === true) {
          return true;
        }
        if (!tree) {
          return false;
        }
      }
    }

    if (shouldIgnore) {
      _.set(ignoredPaths, path, true);
    } else {
      _.set(ignoredPaths, path, false);
    }
  });

  defineMethod(obj, '$isNew', function(val) {
    if (val == null) {
      return isNew;
    }
    if (!isNew && val) {
      obj.$observe();
    } else if (isNew && !val) {
      obj.$observe(false);
    }
    isNew = val;
  });

  defineMethod(obj, '$observe', function(v) {
    if (arguments.length > 0 && !v) {
      N.unobserve(obj, observer);
    } else {
      N.observe(obj, observer);
    }
  });

  if (!isNew) {
    obj.$observe();
  }

  return obj;
}

function _createObserver(obj, delta, state) {
  return function(changes) {
    if (state.ignore) {
      return;
    }

    changes.forEach(function(change) {
      var path = jsonToMongoPath(change.path);
      if (obj.$ignorePath(path)) {
        return;
      }
      if (change.type === 'add' || change.type === 'update') {
        _clean(delta, path);
        _mergeSet(delta, path, _.get(obj, path));
      } else if (change.type === 'delete') {
        _clean(delta, path);
        _mergeUnset(delta, path);
      }
    });
  };
}

/* When `path` is modified, make sure to wipe out any updates to child
 * properties. */
function _clean(delta, path) {
  const re = new RegExp('^' + path + '\\.');
  _.each(delta.$set, function(value, key) {
    if (re.test(key)) {
      delete delta.$set[key];
    }
  });
  _.each(delta.$unset, function(value, key) {
    if (re.test(key)) {
      delete delta.$unset[key];
    }
  });
}

/* When `path` is set, make sure it doesn't conflict with updates to
 * parent properties. */
function _mergeSet(delta, path, value) {
  var parentPaths = getParentPaths(path);
  var remnant;
  for (var i = 0; i < parentPaths.length; ++i) {
    if (delta.$set[parentPaths[i]]) {
      remnant = path.substr(parentPaths[i].length + 1);
      _.set(delta.$set[parentPaths[i]], remnant, value);
      return;
    }
  }

  delta.$set[path] = value;
  delete delta.$unset[path];
}

function _mergeUnset(delta, path) {
  delta.$unset[path] = true;
  delete delta.$set[path];
}

function getParentPaths(path) {
  var pieces = path.split('.');
  var cur = pieces[0];
  var ret = [];
  for (var i = 0; i < pieces.length - 1; ++i) {
    ret.push(cur);
    cur += '.' + pieces[i + 1];
  }
  return ret;
}

function jsonToMongoPath(path) {
  return path.replace(/\//g, '.').substr(1);
}

module.exports = Document;
