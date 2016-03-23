'use strict';

const assert = require('assert');
const co = require('co');
const monogram = require('../');

describe('Basic Overview', function() {
  beforeEach(function(done) {
    co(function*() {
      const db = yield monogram('mongodb://localhost:27017');
      const M = db.model({ collection: 'people' });

      yield M.deleteMany({});

      done();
    }).catch((error) => done(error));
  });

  /**
   * Monogram exports a function that lets you connect to MongoDB
   * and gives you a connection handle. Much like mongoose, you use
   * models to create documents and query for them.
   */
  it('can store documents and run queries', function(done) {
    co(function*() {
      const db = yield monogram('mongodb://localhost:27017');
      // `Person` is a model that stores docs in the 'people' collection
      const Person = db.model({ collection: 'people' });

      const axl = new Person({ name: 'Axl Rose' });
      yield axl.$save();

      let res = yield Person.find({ name: 'Axl Rose' });
      assert.equal(res.length, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  /**
   * Unlike mongoose, you make changes to monogram documents through
   * `get()` and `set()` functions. The primary reason for this is that
   * monogram documents are POJOs by design, with a couple extra helper
   * functions. There are three key advantages to this approach:
   *
   * 1. Ever tried to clone a mongoose document? Monogram documents have fewer edge cases and quirks.
   * 2. Proper safe navigation. `doc.set('a.b.c');` will never throw a TypeError.
   * 3. You don't need to explicitly define a schema
   */
  it('tracks document changes with getters/setters', function(done) {
    co(function*() {
      // acquit:ignore:start
      const db = yield monogram('mongodb://localhost:27017');
      const Person = db.model({ collection: 'people' });

      let axl = new Person({ name: 'Axl Rose' });
      yield axl.$save();
      // acquit:ignore:end
      axl = yield Person.findOne({ name: 'Axl Rose' });

      // You **need** to do `axl.set()` rather than `axl =`
      axl.set('band', "Guns N' Roses");

      assert.equal(axl.get('band'), "Guns N' Roses");

      // The `$delta()` function gives you an object that tells you what
      // has changed.
      assert.deepEqual(axl.$delta(),
        { $set: { band: "Guns N' Roses" }, $unset: {} });

      yield axl.$save();

      let res = yield Person.find({ band: "Guns N' Roses" });
      assert.equal(res.length, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});

describe('query builder', function() {
  it('is chainable', function(done) {
    co(function*() {
      const db = yield monogram('mongodb://localhost:27017');
      const Test = db.model({ collection: 'test' });

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

  it('supports sort, skip, limit', function(done) {
    co(function*() {
      const db = yield monogram('mongodb://localhost:27017');
      const Test = db.model({ collection: 'test' });

      yield Test.deleteMany({});

      yield [
        new Test({ _id: 1 }).$save(),
        new Test({ _id: 2 }).$save(),
        new Test({ _id: 3 }).$save(),
        new Test({ _id: 4 }).$save(),
        new Test({ _id: 5 }).$save()
      ];

      const docs = yield Test.find({ _id: { $gte: 2 } }).
        sort({ _id: -1 }).limit(2).skip(1);

      assert.equal(docs.length, 2);

      assert.equal(docs[0]._id, 4);
      assert.equal(docs[1]._id, 3);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('supports streaming', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      let Test = db.model({ schema: schema, collection: 'test' });

      yield Test.deleteMany({});

      yield [
        new Test({ _id: 1 }).$save(),
        new Test({ _id: 2 }).$save(),
        new Test({ _id: 3 }).$save(),
        new Test({ _id: 4 }).$save(),
        new Test({ _id: 5 }).$save()
      ];

      let stream = yield Test.find({ _id: { $gte: 2 } }).
        stream();

      let expected = 2;
      stream.on('data', function(doc) {
        assert.equal(doc._id, expected++);
      });

      stream.on('end', function() {
        assert.equal(expected, 6);
        done();
      });
    }).catch(function(error) {
      done(error);
    });
  });

  it('supports looping over cursors', done => co(function*() {
    let db = yield monogram('mongodb://localhost:27017');
    let schema = new monogram.Schema({});
    let Test = db.model({ schema: schema, collection: 'test' });

    yield Test.deleteMany({});

    yield [
      new Test({ _id: 1 }).$save(),
      new Test({ _id: 2 }).$save(),
      new Test({ _id: 3 }).$save(),
      new Test({ _id: 4 }).$save(),
      new Test({ _id: 5 }).$save()
    ];

    let cursor = yield Test.find({ _id: { $gte: 2 } }).
      cursor();

    let expected = 4;
    let test = yield cursor.next();
    while (test != null) {
      --expected;
      test = yield cursor.next();
    }

    assert.strictEqual(expected, 0);
    done();
  }).catch(error => done(error)));
});
