var conn = require('./lib/mongodb');
var Model = require('./lib/model');

module.exports = function*() {
  var db = yield conn.apply(null, arguments);

  db.model = function(options) {
    return Model(db, options);
  };

  return db;
};

module.exports.Document = require('./lib/document');
module.exports.Model = Model;
