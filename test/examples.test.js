'use strict';

var assert = require('assert');
var co = require('co');
var monogram = require('../');

describe('connecting and querying', function() {
  it('works', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let Test = db.model('test');

      yield Test.deleteMany({});

      let t = new Test({ _id: 2 });
      yield t.$save();
      let res = yield Test.find({ _id: 2 });
      assert.equal(res.length, 1);
      assert.equal(res[0]._id, 2);

      res[0].x = 3;
      assert.deepEqual(res[0].$delta().$set, { x: 3 });
      yield res[0].$save();

      res = yield Test.find({ _id: 2 });
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
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      schema.middleware('$save', function*(next) {
        assert.ok(this.$isNew());
        yield next;
        assert.ok(!this.$isNew());
      });
      let Test = db.model({ schema: schema, collection: 'test2' });

      yield Test.deleteMany({});

      let t = new Test({ _id: 5 });

      yield t.$save();

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('query middleware', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      schema.middleware('find', function*(next) {
        var docs = yield next;
        assert.equal(docs.length, 1);
        docs.push({ _id: 'fakedoc' });
        return docs;
      });
      schema.middleware('find', function*(next) {
        var docs = yield next;
        assert.equal(docs.length, 0);
        docs.push({ _id: 'fakedoc' });
        return docs;
      });
      let Test = db.model({ schema: schema, collection: 'test3' });

      let docs = yield Test.find({});

      assert.deepEqual(docs, [{ _id: 'fakedoc' }, { _id: 'fakedoc' }]);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('query builder', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      let Test = db.model({ schema: schema, collection: 'test4' });

      yield Test.deleteMany({});

      let t = new Test({ _id: 5 });

      yield t.$save();

      let count = yield Test.find({ _id: 5 }).count({});

      assert.equal(count, 1);

      count = yield Test.find({ _id: 4 }).count({});

      assert.equal(count, 0);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('custom document methods', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});

      schema.method('document', '$validate', function() {
        throw new Error('validation error!');
      });

      schema.middleware('$save', function*(next) {
        yield this.$validate();
        yield next;
      });

      let Test = db.model({ schema: schema, collection: 'test5' });

      yield Test.deleteMany({});

      let t = new Test({ _id: 5 });

      try {
        yield t.$save();
        assert.ok(false);
      } catch(err) {
        assert.equal(err.toString(), 'Error: validation error!');
      }

      let count = yield Test.count({});

      assert.equal(count, 0);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('custom query methods', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});

      schema.method('query', 'checkVisible', function() {
        this.find({ isVisible: true });
        return this;
      });

      let Test = db.model({ schema: schema, collection: 'test6' });

      yield Test.deleteMany({});

      yield [
        new Test({ _id: 1, isVisible: true }).$save(),
        new Test({ _id: 2, isVisible: false }).$save()
      ];

      let docs = yield Test.find({}).checkVisible();

      assert.equal(docs.length, 1);

      assert.equal(docs[0]._id, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});
