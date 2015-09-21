'use strict';

var assert = require('assert');
var co = require('co');
var monogram = require('../');

describe('query', function() {
  it('iterate over filters', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({
        test: { $type: Number }
      });

      let Test = db.model({ schema: schema, collection: 'test' })

      let query = Test.find({ test: 1, otherPath: 2 });
      let filters = [];
      query.filters(function(obj, key, schema) {
        filters.push({
          obj: obj,
          key: key,
          schema: schema
        })
      });

      assert.deepEqual(filters, [
        {
          obj: { test: 1, otherPath: 2 },
          key: 'test',
          schema: { $type: Number }
        },
        {
          obj: { test: 1, otherPath: 2 },
          key: 'otherPath',
          schema: null
        }
      ]);

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});
