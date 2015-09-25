'use strict';

var _ = require('lodash');
var N = require('nested-observe');
var defineMethod = require('./utils').defineMethod;

function Document(obj, isNew) {
  let delta = { $set: _.cloneDeep(obj), $unset: {} };
  let state = {};
  let observer = _createObserver(obj, delta, state);
  let transforms = [];

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
    return obj;
  });

  defineMethod(obj, '$transform', function(fn) {
    if (!fn) {
      return transforms;
    }
    transforms.push(fn);
    return transforms;
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

  obj.$observe();

  return obj;
}

function _createObserver(obj, delta, state) {
  return function(changes) {
    if (state.ignore) {
      return;
    }

    changes.forEach(function(change) {
      let path = jsonToMongoPath(change.path);
      let value = _.get(obj, path);
      let transforms = obj.$transform();

      for (let i = 0, length = transforms.length; i < length; ++i) {
        let v = transforms[i](path, change, value);
        if (v === null) {
          return;
        }
        if (v === undefined) {
          continue;
        }
        value = v;
      }

      if (change.type === 'add' || change.type === 'update') {
        _clean(delta, path);
        _mergeSet(delta, path, value);
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
