'use strict';

var conn = require('./lib/mongodb');
var Model = require('./lib/model');

let globalPlugins = {};

module.exports = function*() {
  var db = yield conn.apply(null, arguments);

  var models = {};

  db.model = function(name, options) {
    if (typeof name === 'object') {
      options = name;
      name = null;
    }

    if (!options) {
      return models[name];
    }

    if (options.schema) {
      let keys = Object.keys(globalPlugins);
      let length = keys.length;
      let plugin = null;
      for (let i = 0; i < length; ++i) {
        plugin = globalPlugins[keys[i]];
        plugin.plugin(options.schema, plugin.options);
      }
    }
    var model = Model(db, options);
    if (name) {
      models[name] = model;
    }

    return model;
  };

  return db;
};

module.exports.use = function(name, plugin, options) {
  if (!plugin) {
    delete globalPlugins[name];
    return;
  }
  globalPlugins[name] = { plugin: plugin, options: options };
};

module.exports.Document = require('./lib/document');
module.exports.Model = Model;
module.exports.Schema = require('./lib/schema');

module.exports.ObjectId = require('mongodb').ObjectId;
