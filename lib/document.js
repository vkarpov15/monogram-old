'use strict';

const _ = require('lodash');
const defineMethod = require('./utils').defineMethod;
const type = require('type-component');

function Document(obj, isNew) {
  let delta = { $set: isNew ? _.cloneDeep(obj) : {}, $unset: {} };

  defineMethod(obj, 'get', function(path) {
    const res = _.get(obj, path);
    if (type(res) === 'array') {
      _.each(['push'], function(arrayFn) {
        const oldArrayFn = res[arrayFn];
        defineMethod(res, arrayFn, function() {
          oldArrayFn.apply(res, arguments);
          _mergeSet(delta, path, res);
        });
      });
    }
    return res;
  });

  defineMethod(obj, 'set', function(path, value) {
    _clean(delta, path);
    if (type(value) === 'undefined') {
      _mergeUnset(delta, path);
      _unset(obj, path);
    } else {
      _mergeSet(delta, path, value);
      _.set(obj, path, value);
    }
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

module.exports = Document;
