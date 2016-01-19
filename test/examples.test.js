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

describe('custom methods', function() {
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

      let Test = db.model({ schema: schema, collection: 'test' });

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

      let Test = db.model({ schema: schema, collection: 'test' });

      yield Test.deleteMany({});

      yield Test.insertMany([
        { _id: 1, isVisible: true },
        { _id: 2, isVisible: false }
      ]);

      let docs = yield Test.find({}).checkVisible();

      assert.equal(docs.length, 1);

      assert.equal(docs[0]._id, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('custom model methods', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});

      schema.method('model', 'findVisible', function() {
        return this.find({ isVisible: true });
      });

      let Test = db.model({ schema: schema, collection: 'test' });

      yield Test.deleteMany({});

      yield [
        new Test({ _id: 1, isVisible: true }).$save(),
        new Test({ _id: 2, isVisible: false }).$save()
      ];

      let docs = yield Test.findVisible();

      assert.equal(docs.length, 1);

      assert.equal(docs[0]._id, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('schema queue', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});

      schema.queue(function() {
        this.fullName = `${this.get('name.first')} ${this.get('name.last')}`;
      });

      let Test = db.model({ schema: schema, collection: 'test' });

      let t = new Test({ name: { first: 'Axl', last: 'Rose' } }, false);

      assert.deepEqual(t.$delta(), { $set: {}, $unset: {} });

      assert.equal(t.fullName, 'Axl Rose');

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});


describe('middleware', function() {
  it('$save middleware', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      schema.middleware('$save', function*(next) {
        assert.ok(this.$isNew());
        yield next;
        assert.ok(!this.$isNew());
      });
      let Test = db.model({ schema: schema, collection: 'test' });

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
      let Test = db.model({ schema: schema, collection: 'test' });

      yield Test.deleteMany({});

      let docs = yield Test.find({});

      assert.deepEqual(docs, [{ _id: 'fakedoc' }, { _id: 'fakedoc' }]);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  it('for custom methods', function(done) {
    co(function*() {
      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});

      schema.method('document', '$validate', function() {
        return true;
      });

      schema.middleware('$validate', function*(next) {
        throw new Error('pre-validation error!');
      });

      schema.middleware('$save', function*(next) {
        yield this.$validate();
        yield next;
      });

      let Test = db.model({ schema: schema, collection: 'test' });

      yield Test.deleteMany({});

      let t = new Test({ _id: 5 });

      try {
        yield t.$save();
        assert.ok(false);
      } catch(err) {
        assert.equal(err.toString(), 'Error: pre-validation error!');
      }

      let count = yield Test.count({});

      assert.equal(count, 0);

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});

describe('plugins', function(done) {
  it('works', function(done) {
    co(function*() {
      monogram.use('validation', (schema) => {
        schema.method('document', '$validate', function() {
          throw new Error('failed!');
        });
      });

      let db = yield monogram('mongodb://localhost:27017');
      let schema = new monogram.Schema({});
      let Test = db.model({ schema: schema, collection: 'test' });

      let t = new Test({});
      try {
        t.$validate();
        assert.ok(false);
      } catch(error) {
        assert.equal(error.toString(), 'Error: failed!');
      }
      done();
    }).catch(function(error) {
      done(error);
    });
  });

  afterEach(function() {
    monogram.use('validation', null);
  });
});
