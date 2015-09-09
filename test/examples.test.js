var assert = require('assert');
var co = require('co');
var monogram = require('../');

describe('connecting and querying', function() {
  it('works', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var Test = db.model('test');

      yield Test.remove({});

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

  it('save middleware', function(done) {
    co(function*() {
      var db = yield monogram('mongodb://localhost:27017');
      var schema = new monogram.Schema({});
      schema.middleware('$save', function*(next) {
        assert.ok(this.$isNew());
        yield next;
        assert.ok(!this.$isNew());
      });
      var Test = db.model({ schema: schema, collection: 'test2' });

      yield Test.remove({});

      var t = new Test({ _id: 5 });

      yield t.$save();

      done();
    }).catch(function(error) {
      done(error);
    });
  });
});
