var assert = require('assert');
var Schema = require('../lib/schema');

describe('schema', function() {
  it('compiles paths', function() {
    var schema = new Schema({
      test: 'Number',
      nested: {
        a: {
          $type: 'Number'
        }
      }
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      test: { $type: 'Number' },
      nested: { $type: 'nested' },
      'nested.a': { $type: 'Number' }
    });
  });

  it('handles arrays', function() {
    var schema = new Schema({
      test: 'Number',
      arrMixed: [],
      arrPlain: ['Number'],
      arrNested: [['Number']]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'test': { $type: 'Number' },
      'arrMixed': { $type: 'array' },
      'arrMixed.$': { $type: 'mixed' },
      'arrPlain': { $type: 'array' },
      'arrPlain.$': { $type: 'Number' },
      'arrNested': { $type: 'array' },
      'arrNested.$': { $type: 'array' },
      'arrNested.$.$': { $type: 'Number' }
    });
  });

  it('handles nested document arrays', function() {
    var schema = new Schema({
      docs: [{ _id: 'ObjectId' }]
    });

    schema.compile();

    assert.deepEqual(schema._paths, {
      'docs': { $type: 'array' },
      'docs.$': { $type: 'nested' },
      'docs.$._id': { $type: 'ObjectId' }
    });
  });
});
