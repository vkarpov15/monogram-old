var mongodb = require('mongodb');

module.exports = function(uri, options) {
  return mongodb.MongoClient.connect(uri, options);
};

module.exports.ObjectId = mongodb.ObjectId;
