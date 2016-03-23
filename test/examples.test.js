'use strict';

const assert = require('assert');
const co = require('co');
const mongodb = require('mongodb');
const monogram = require('../');

describe('Basic Overview', function() {
  let db;

  beforeEach(function(done) {
    co(function*() {
      db = yield mongodb.MongoClient.connect('mongodb://localhost:27017');
      const M = new monogram.Model(db.collection('people'));

      yield db.collection('people').deleteMany({});

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
      const db = yield mongodb.MongoClient.connect('mongodb://localhost:27017');
      // `Person` is a model that stores docs in the 'people' collection
      const Person = new monogram.Model(db.collection('people'));

      yield Person.save({ name: 'Axl Rose' });

      let res = yield Person.find({ name: 'Axl Rose' });
      assert.equal(res.length, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  /**
   * Monogram documents are POJOs by design - instead of calling member
   * functions on a special document class, you just call helper functions
   * on the model. There are two key advantages to this approach:
   *
   * 1. Ever tried to clone a mongoose document? Monogram documents have fewer edge cases and quirks.
   * 2. You don't need to explicitly define a schema
   */
  it('save and find', function(done) {
    co(function*() {
      // acquit:ignore:start
      const db = yield mongodb.MongoClient.connect('mongodb://localhost:27017');
      // `Person` is a model that stores docs in the 'people' collection
      const Person = new monogram.Model(db.collection('people'));

      let axl = { name: 'Axl Rose' };
      yield Person.save(axl);
      // acquit:ignore:end
      axl = (yield Person.find({ name: 'Axl Rose' }))[0];

      // You **need** to do `axl.set()` rather than `axl =`
      axl.band = "Guns N' Roses";

      yield Person.save(axl);

      let res = yield Person.find({ band: "Guns N' Roses" });
      assert.equal(res.length, 1);

      done();
    }).catch(function(error) {
      done(error);
    });
  });

  /**
   * If you define a schema, monogram will cast against that schema for you,
   * much like mongoose does.
   */

  it('casting', function(done) {
    co(function*() {
      const schema = new monogram.Schema({
        bacon: { $type: Number },
        eggs: { $type: Number }
      });
      const Breakfast = new monogram.Model(db.collection('breakfast'), schema);

      yield Breakfast.save({ bacon: '1', eggs: '2' });

      const res = yield Breakfast.find({ bacon: 1, eggs: 2 });
      assert.equal(res.length, 1);

      try {
        yield Breakfast.save({ bacon: 'Not a number' });
      } catch(error) {
        assert.deepEqual(error.errors, {
          bacon: new Error("Error: Could not cast 'Not a number' to Number")
        });
        done();
      }
    }).catch(done);
  });
});
