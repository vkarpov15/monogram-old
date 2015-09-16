var assert = require('assert');
var Schema = require('../lib/schema');

describe('schema', function() {
  it('compiles paths', function() {
    var schema = new Schema({
      test: Number,
      nested: {
        a: {
          $type: Number
        }
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      test: { $type: Number },
      nested: { $type: Object },
      'nested.a': { $type: Number }
    });
  });

  it('handles arrays', function() {
    var schema = new Schema({
      test: Number,
      arrMixed: [],
      arrPlain: [Number],
      arrNested: [[Number]]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: Number },
      'arrMixed': { $type: Array },
      'arrMixed.$': { $type: Object },
      'arrPlain': { $type: Array },
      'arrPlain.$': { $type: Number },
      'arrNested': { $type: Array },
      'arrNested.$': { $type: Array },
      'arrNested.$.$': { $type: Number }
    });
  });

  it('handles nested document arrays', function() {
    var schema = new Schema({
      docs: [{ _id: Number }]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'docs': { $type: Array },
      'docs.$': { $type: Object },
      'docs.$._id': { $type: Number }
    });
  });

  it('treats keys that start with $ as a terminus', function() {
    var schema = new Schema({
      test: {
        $prop: 1
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $prop: 1 }
    });
  });
});
