var _ = require('lodash');
var mongodb = require('mongodb');
var N = require('nested-observe');

function Document(obj, isNew) {
  var delta = { $set: {}, $unset: {} };
  var observer = _createObserver(obj, delta);

  obj.$delta = function() {
    N.deliverChangeRecords(observer);
    return delta;
  }

  if (!isNew) {
    N.observe(obj, observer);
  }

  return obj;
}

function _createObserver(obj, delta) {
  return function(changes) {
    changes.forEach(function(change) {
      var path = jsonToMongoPath(change.path);
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

exports.Document = Document;
