'use strict';

var assert = require('assert');
var Document = require('../').Document;

describe('Document', function() {
  it('tracks changes on non-new docs', function() {
    var obj = Document({}, false);
    obj.set('a', 1);
    assert.deepEqual(obj.$delta(), { $set: { a: 1 }, $unset: {} });
  });

  it('tracks changes on nested docs', function() {
    var obj = Document({}, false);

    obj.set('nested', { x: 2 });
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 2 } }, $unset: {} });

    obj.set('nested.x', 3);
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 3 } }, $unset: {} });

    obj.set('nested', { y: 2 });
    assert.deepEqual(obj.$delta(),
      { $set: { nested: { y: 2 } }, $unset: {} });
  });

  it('handles deletes', function() {
    var obj = Document({}, false);

    obj.set('top', 1);
    obj.set('nested', { x: 2 });

    assert.deepEqual(obj.$delta(),
      { $set: { top: 1, nested: { x: 2 } }, $unset: {} });

    obj.set('nested.x', undefined);
    obj.set('top', undefined);

    assert.deepEqual(obj.$delta(),
      { $set: { nested: {} }, $unset: { 'nested.x': true, top: true } });

    obj.set('nested', undefined);
    assert.deepEqual(obj.$delta(),
      { $set: { }, $unset: { top: true, nested: true } });
  });

  it('nested getters/setters', function() {
    var obj = Document({}, false);

    obj.set('nested', { x: 2 });
    obj.get('nested').set('x', 5);

    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 5 } }, $unset: {} });
  });

  it('chaining nested setters', function() {
    var obj = Document({}, false);

    obj.set('nested', { x: 2 });
    obj.get('nested').set('x', 5).set('y', 6);

    assert.deepEqual(obj.$delta(),
      { $set: { nested: { x: 5, y: 6 } }, $unset: {} });
  });

  it('getters handle arrays', function() {
    var obj = Document({ people: [{ name: 'Axl' }, { name: 'Slash' }] });

    assert.deepEqual(obj.get('people.name'), ['Axl', 'Slash']);
  });

  it('observable', function() {
    let obj = Document({}, false);

    let calls = 0;

    obj.$observable().subscribe({
      next: function(val) {
        ++calls;
        assert.equal(val.path, 'test');
        assert.equal(val.value, 1);
      }
    });

    obj.set('test', 1);

    assert.equal(calls, 1);
  });
});
