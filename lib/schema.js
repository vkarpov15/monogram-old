var _ = require('lodash');
var composition = composition;
var defineMethod = require('./utils').defineMethod;

module.exports = Schema;

function Schema(obj) {
  this._obj = _.cloneDeep(obj);
  this._paths = {};
  this._middleware = {};
  this._methods = {};
}

Schema.prototype.compile = function() {
  this._paths = visitor(this._obj);
};

Schema.prototype.middleware = function(name, fn) {
  if (!fn) {
    return this._middleware[name];
  }

  if (!this._middleware[name]) {
    this._middleware[name] = [];
  }
  this._middleware[name].push(fn);
};

Schema.prototype.method = function(clazz, name, fn) {
  if (!name) {
    return this._methods[clazz];
  }
  if (!fn) {
    return this._methods[clazz][name];
  }

  if (!this._methods[clazz]) {
    this._methods[clazz] = {};
  }
  this._methods[clazz][name] = fn;
};

Schema.prototype.applyMethods = function(clazz, instance) {
  if (!this._methods[clazz]) {
    return;
  }

  var keys = Object.keys(this._methods[clazz]);
  for (var i = 0; i < keys.length; ++i) {
    var name = keys[i];
    defineMethod(instance, name, this._methods[clazz][name]);
  }
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
