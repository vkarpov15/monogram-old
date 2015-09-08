var _ = require('lodash');

module.exports = Schema;

function Schema(obj) {
  this._obj = _.cloneDeep(obj);
  this._paths = {};
}

Schema.prototype.compile = function() {
  this._paths = visitor(this._obj);
};

function visitor(obj) {
  var paths = paths || {};

  visitObject(obj, '', paths);
  return paths;
}

function visitArray(arr, path, paths) {
  paths[path] = { $type: Array };
  if (arr.length > 0) {
    if (Array.isArray(arr[0])) {
      visitArray(arr[0], path + '.$', paths);
    } else if (typeof arr[0] === 'object') {
      visitObject(arr[0], path + '.$', paths);
    } else {
      paths[path + '.$'] = { $type: arr[0] };
    }
  } else {
    paths[path + '.$'] = { $type: Object }
  }
}

function visitObject(obj, path, paths) {
  if (obj.$type) {
    paths[path] = obj;
    return;
  }

  if (path) {
    paths[path] = { $type: Object };
  }
  _.each(obj, function(value, key) {
    if (Array.isArray(value)) {
      visitArray(value, join(path, key), paths);
    } else if (typeof value === 'object') {
      visitObject(value, join(path, key), paths);
    } else {
      paths[join(path, key)] = { $type: value };
    }
  });
}

function join(path, key) {
  if (path) {
    return path + '.' + key;
  }
  return key;
}
