'use strict';

let _ = require('lodash');
let composition = require('composition');
let debug = require('debug')('monogram:query:debug');
const inspect = require('util').inspect;
let TransformStream = require('stream').Transform;

module.exports = QueryFactory;

function QueryFactory(model, schema, collection) {
  var Query = function() {
    this.s = {
      collection: collection,
      fieldName: null,
      filter: null,
      model: model,
      update: null,
      op: null,
      options: null,
      schema: schema
    };
  };

  Query.prototype = _.clone(functions);

  return Query;
}

var functions = {};

functions.count = function(filter, options) {
  this.s.op = 'count';
  this.s.filter = merge(this.s.filter, filter);
  this.s.options = merge(this.s.options, options);
  return this;
};

functions._count = function() {
  debug('count:', this.s.filter, this.s.options);
  return this.s.collection.count(this.s.filter, this.s.options);
};

functions.distinct = function(fieldName, filter, options) {
  this.s.op = 'distinct';
  this.s.fieldName = fieldName || this.s.fieldName;
  this.s.filter = merge(this.s.filter, filter);
  this.s.options = merge(this.s.options, options);
  return this;
};

functions._distinct = function() {
  return this.s.collection.distinct(this.s.fieldName,
    this.s.filter, this.s.options);
};

functions.find = function(filter, options) {
  debug('find:', filter, options);
  this.s.op = 'find';
  this.s.filter = merge(this.s.filter, filter);
  this.s.options = merge(this.s.options, options);
  return this;
};

functions._find = function() {
  return new Promise((resolve, reject) => {
    this.s.collection.
      find(this.s.filter || {}, this.s.options || {}).
      toArray((error, docs) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(_.map(docs, (v) => this.s.model(v, false)));
      });
  });
};

functions.cursor = function() {
  this.s.op = 'cursor';
  return this;
};

functions._cursor = function() {
  let _this = this;
  let stream = new TransformStream({ objectMode: true });
  let cursor = this.s.collection.
    find(this.s.filter || {}, this.s.options || {});
  let convert = (doc) => {
    return this.s.model(doc, false);
  }

  stream._transform = function(data, encoding, callback) {
    this.push(convert(data));
    callback();
  };
  
  ['next', 'nextObject'].forEach(fn => stream[fn] = () => cursor[fn]());

  return Promise.resolve(cursor.pipe(stream));
};

['findOne', 'findOneAndDelete'].forEach(function(findOneOp) {
  functions[findOneOp] = function(filter, options) {
    this.s.op = findOneOp;
    this.s.filter = merge(this.s.filter, filter);
    this.s.options = merge(this.s.options, options);
    return this;
  };

  functions['_' + findOneOp] = function() {
    debug(`${this.s.collection}: ${findOneOp} ${inspect(this.s.filter)}`);
    return new Promise((resolve, reject) => {
      this.s.collection[findOneOp](this.s.filter, this.s.options, (error, doc) => {
        if (error) {
          reject(error);
          return;
        }
        if (doc) {
          resolve(this.s.model(doc, false));
        }
        resolve(null);
      });
    });
  };
});

['deleteOne', 'deleteMany'].forEach(function(deleteOp) {
  functions[deleteOp] = function(filter, options) {
    this.s.op = deleteOp;
    this.s.filter = merge(this.s.filter, filter);
    this.s.options = merge(this.s.options, options);
    return this;
  };

  functions['_' + deleteOp] = function() {
    return this.s.collection[deleteOp](this.s.filter, this.s.options);
  };
});

['replaceOne', 'updateOne', 'updateMany'].forEach(function(updateOp) {
  functions[updateOp] = function(filter, update, options) {
    this.s.op = updateOp;
    this.s.filter = merge(this.s.filter, filter);
    this.s.update = merge(this.s.update, update);
    this.s.options = merge(this.s.options, options);
    return this;
  };

  functions['_' + updateOp] = function() {
    return this.s.collection[updateOp](this.s.filter, this.s.update,
      this.s.options);
  };
});

['findOneAndReplace', 'findOneAndUpdate'].forEach(function(findAndModifyOp) {
  functions[findAndModifyOp] = function(filter, update, options) {
    this.s.op = findAndModifyOp;
    this.s.filter = merge(this.s.filter, filter);
    this.s.update = merge(this.s.update, update);
    this.s.options = merge(this.s.options, options);
    return this;
  };

  functions['_' + findAndModifyOp] = function() {
    return new Promise((resolve, reject) => {
      this.s.collection[findAndModifyOp](this.s.filter, this.s.update,
        this.s.options, (error, doc) => {
          if (error) {
            reject(error);
            return;
          }
          if (doc) {
            resolve(this.s.model(doc.value, false));
          }
          resolve(null);
        });
    });
  };
});

functions.options = function(options) {
  this.s.options = merge(this.s.options, options);
  return this;
};

['skip', 'limit', 'projection', 'sort'].forEach(function(option) {
  functions[option] = function(v) {
    var obj = {};
    obj[option] = v;
    return this.options(obj);
  };
});

functions.then = function(resolve, reject) {
  debug('exec:', this.s.op);
  return this['_' + this.s.op]().then(resolve, reject);
};

function merge(dest, src) {
  if (!src) {
    return;
  }
  var keys = Object.keys(src);
  dest = dest || {};
  for (var i = 0; i < keys.length; ++i) {
    dest[keys[i]] = src[keys[i]];
  }
  return dest;
}

function join(path, key) {
  if (path) {
    return path + '.' + key;
  }
  return key;
}
