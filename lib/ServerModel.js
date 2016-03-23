'use strict';

const Model = require('./Model');

class ServerModel extends Model {
  constructor(collection, schema) {
    super(schema);
    this.collection = collection;
  }

  save(doc, user, updates) {
    if (this.schema) {
      const err = this.cast(doc).error;
      if (err) {
        throw err;
      }
    }
    return this.collection.
      updateOne({ _id: doc._id }, updates || doc, { upsert: true });
  }

  find(query, user, options) {
    return this.collection.find(query).toArray();
  }
}

module.exports = ServerModel;
