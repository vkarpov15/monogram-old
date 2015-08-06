var assert = require('assert');
var co = require('co');
var Document = require('../').Document;

describe('Document', function() {
  it('tracks changes on non-new docs', function(done) {
    co(function*() {
      var obj = Document({}, false);
      obj.a = 1;
      assert.deepEqual(yield obj.$delta(), { $set: { a: 1 }, $unset: {} });
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('tracks changes on nested docs', function(done) {
    co(function*() {
      var obj = Document({}, false);

      obj.nested = { x: 2 };
      assert.deepEqual(yield obj.$delta(),
        { $set: { nested: { x: 2 } }, $unset: {} });

      ++obj.nested.x;
      assert.deepEqual(yield obj.$delta(),
        { $set: { nested: { x: 3 } }, $unset: {} });

      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('handles deletes', function(done) {
    co(function*() {
      var obj = Document({}, false);

      obj.top = 1;
      obj.nested = { x: 2 };

      assert.deepEqual(yield obj.$delta(),
        { $set: { top: 1, nested: { x: 2 } }, $unset: {} });

      delete obj.nested['x'];
      delete obj.top;

      assert.deepEqual(yield obj.$delta(),
        { $set: { nested: {} }, $unset: { 'nested.x': true, top: true } });

      delete obj['nested'];
      assert.deepEqual(yield obj.$delta(),
        { $set: { }, $unset: { top: true, nested: true } });

      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('handles arrays', function(done) {
    co(function*() {
      var obj = Document({}, false);

      obj.arr = [1, 2];

      assert.deepEqual(yield obj.$delta(),
        { $set: { arr: [1, 2] }, $unset: {} });

      obj.arr[1] = 3;

      assert.deepEqual(yield obj.$delta(),
        { $set: { arr: [1, 3] }, $unset: {} });

      obj.arr.push(5);

      assert.deepEqual(yield obj.$delta(),
        { $set: { arr: [1, 3, 5] }, $unset: {} });

      done();
    }).catch(function(err) {
      done(err);
    });
  });
});
