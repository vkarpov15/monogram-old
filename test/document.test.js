var assert = require('assert');
var Document = require('../').Document;

describe('Document', function() {
  it('tracks changes on non-new docs', function() {
    var obj = Document({}, false);
    obj.a = 1;
    assert.deepEqual(obj.$delta(), { $set: { a: 1 }, $unset: {} });
  });

  it('tracks changes on nested docs', function() {
    var obj = Document({}, false);

    obj.nested = { x: 2 };
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 2 } }, $unset: {} });

    ++obj.nested.x;
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 3 } }, $unset: {} });

    obj.nested = { y: 2 };
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { y: 2 } }, $unset: {} });
  });

  it('clears changes on child fields', function() {
    var obj = Document({ nested: { x: 1 } }, false);

    obj.nested.x = 5;
    assert.deepEqual(obj.$delta(),
      { $set: { 'nested.x': 5 }, $unset: {} });

    obj.nested = { x: 3 };
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 3 } }, $unset: {} });
  });

  it('handles deletes', function() {
    var obj = Document({}, false);

    obj.top = 1;
    obj.nested = { x: 2 };

    assert.deepEqual(obj.$delta(),
      { $set: { top: 1, nested: { x: 2 } }, $unset: {} });

    delete obj.nested['x'];
    delete obj.top;

    assert.deepEqual(obj.$delta(),
      { $set: { nested: {} }, $unset: { 'nested.x': true, top: true } });

    delete obj['nested'];
    assert.deepEqual(obj.$delta(),
      { $set: { }, $unset: { top: true, nested: true } });
  });

  it('handles arrays', function() {
    var obj = Document({}, false);

    obj.arr = [1, 2];

    assert.deepEqual(obj.$delta(),
      { $set: { arr: [1, 2] }, $unset: {} });

    obj.arr[1] = 3;

    assert.deepEqual(obj.$delta(),
      { $set: { arr: [1, 3] }, $unset: {} });

    obj.arr.push(5);

    assert.deepEqual(obj.$delta(),
      { $set: { arr: [1, 3, 5] }, $unset: {} });
  });

  it('can ignore changes', function() {
    var obj = Document({}, false);;

    obj.$ignore(function() {
      obj.test = 1;
    });

    assert.deepEqual(obj.$delta(),
      { $set: { }, $unset: {} });
  });
});
