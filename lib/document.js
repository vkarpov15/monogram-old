'use strict';

const _ = require('lodash');
const defineMethod = require('./utils').defineMethod;
const type = require('type-component');

function Document(obj, isNew) {
  let delta = { $set: {}, $unset: {} };

  defineMethod(obj, 'get', function(path) {
    return _getter.call(obj, delta, path);
  });

  defineMethod(obj, 'set', function(path, value) {
    return _setter.call(obj, delta, path, value);
  });

  defineMethod(obj, '$delta', function() {
    return delta;
  });

  defineMethod(obj, '$isNew', function(val) {
    if (val == null) {
      return isNew;
    }
    isNew = val;
  });

  return obj;
}

/**
 * Internal getter function. Lazily instantiates getters/setters on
 * nested paths
 *
 * @param {Object} delta
 * @param {String} path
 */

function _getter(delta, path) {
  const res = _safeGet(this, path);
  if (type(res.value) === 'array' || type(res.value) === 'object') {
    defineMethod(res.value, 'get', (_path) => {
      return _getter.call(this, delta, path + '.' + _path);
    });
    if (res.isReal) {
      defineMethod(res.value, 'set', (_path, value) => {
        return _setter.call(this, delta, path + '.' + _path, value, res.value);
      });
    }
  }
  return res.value;
}

function _setter(delta, path, value, res) {
  _clean(delta, path);
  if (type(value) === 'undefined') {
    _mergeUnset(delta, path);
    _unset(this, path);
  } else {
    _mergeSet(delta, path, value);
    _.set(this, path, value);
  }
  return res || this;
}

function _unset(obj, path) {
  const dot = path.lastIndexOf('.');
  if (dot === -1) {
    delete obj[path];
    return;
  }
  const parentPath = path.substring(0, dot);
  const leaf = path.substring(dot + 1);
  const parent = _.get(obj, parentPath);
  if (parent) {
    delete parent[leaf];
  }
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

function _safeGet(obj, path) {
  const pieces = path.split('.');
  let cur = obj;
  let isReal = true;

  for (let i = 0; i < pieces.length; ++i) {
    if (!cur) {
      return;
    }
    if (type(cur) === 'array') {
      isReal = false;
      let newCur = [];
      for (let j = 0; j < cur.length; ++j) {
        if (!cur[j][pieces[i]]) {
          continue;
        }
        if (type(cur[j][pieces[i]]) === 'array') {
          for (let k = 0; k < cur[j][pieces[i]].length; ++k) {
            newCur.push(cur[j][pieces[i]][k]);
          }
        } else {
          newCur.push(cur[j][pieces[i]]);
        }
      }
      cur = newCur;
    } else {
      cur = cur[pieces[i]];
    }
  }

  return { value: cur, isReal: isReal };
}

module.exports = Document;
