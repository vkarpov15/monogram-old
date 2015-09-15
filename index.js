'use strict';

var conn = require('./lib/mongodb');
var Model = require('./lib/model');

let globalPlugins = {};

module.exports = function*() {
  var db = yield conn.apply(null, arguments);

  db.model = function(options) {
    if (options.schema) {
      let keys = Object.keys(globalPlugins);
      let length = keys.length;
      let plugin = null;
      for (let i = 0; i < length; ++i) {
        plugin = globalPlugins[keys[i]];
        plugin.plugin(options.schema, plugin.options);
      }
    }
    return Model(db, options);
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
