var _ = require('lodash');
var mongodb = require('mongodb');
var N = require('nested-observe');

function Document(obj, isNew) {
  var delta = { $set: {}, $unset: {} };

  obj.$delta = function() {
    return new Promise(function(resolve, reject) {
      setImmediate(function() {
        resolve(delta);
      });
    });
  }

  if (!isNew) {
    _observe(obj, delta);
  }

  return obj;
}

function _observe(obj, delta) {
  N.observe(obj, function(changes) {
    changes.forEach(function(change) {
      var path = jsonToMongoPath(change.path);
      if (change.type === 'add') {
        _clean(delta, path);
        delta.$set[path] = _.get(obj, path);
        delete delta.$unset[path];
      } else if (change.type === 'delete') {
        _clean(delta, path);
        delta.$unset[path] = true;
        delete delta.$set[path];
      }
    });
  });
}

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

function jsonToMongoPath(path) {
  return path.replace(/\//g, '.').substr(1);
}

exports.Document = Document;
