var assert = require('assert');
var co = require('co');
var monogram = require('../');

describe('connecting and querying', function() {
  it('works', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var Test = db.model('test');

      yield Test.deleteMany({});

      var t = new Test({ _id: 2 });
      yield t.$save();
      var res = yield Test.find({ _id: 2 });
      assert.equal(res.length, 1);
      assert.equal(res[0]._id, 2);

      res[0].x = 3;
      assert.deepEqual(res[0].$delta().$set, { x: 3 });
      yield res[0].$save();

      var res = yield Test.find({ _id: 2 });
      assert.equal(res.length, 1);
      assert.equal(res[0]._id, 2);
      assert.equal(res[0].x, 3);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('$save middleware', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var schema = new monogram.Schema({});
      schema.middleware('$save', function*(next) {
        assert.ok(this.$isNew());
        yield next;
        assert.ok(!this.$isNew());
      });
      var Test = db.model({ schema: schema, collection: 'test2' });

      yield Test.deleteMany({});

      var t = new Test({ _id: 5 });

      yield t.$save();

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('query middleware', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var schema = new monogram.Schema({});
      schema.middleware('find', function*(next) {
        var docs = yield next;
        assert.equal(docs.length, 0);
        docs.push({ _id: 'fakedoc' });
        return docs;
      });
      var Test = db.model({ schema: schema, collection: 'test3' });

      var docs = yield Test.find({});

      assert.deepEqual(docs, [{ _id: 'fakedoc' }]);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('query builder', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var schema = new monogram.Schema({});
      var Test = db.model({ schema: schema, collection: 'test4' });

      var count = yield Test.count({});

      assert.equal(count, 0);

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});
