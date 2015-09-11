var _ = require('lodash');
var composition = require('composition');
var debug = require('debug')('monogram:query:debug');

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
      options: null
    };
  };

  Query.prototype = _.clone(functions);

  var funcs = Object.keys(functions);
  for (var i = 0; i < funcs.length; ++i) {
    var key = funcs[i];
    if (key.charAt(0) === '_') {
      continue;
    }
    if (schema && schema.middleware(key)) {
      Query.prototype['_' + key] =
        composition(schema.middleware(key).concat([functions['_' + key]]));
    }
  }

  return Query;
}

var functions = {};

functions.count = function(filter, options) {
  this.s.op = 'count';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

functions._count = function() {
  return this.s.collection.count(this.s.filter, this.s.options);
};

functions.distinct = function(fieldName, filter, options) {
  this.s.op = 'distinct';
  this.s.fieldName = fieldName || this.s.fieldName;
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

functions._count = function() {
  return this.s.collection.count(this.s.filter, this.s.options);
};

functions.find = function(filter, options) {
  debug('find:', filter, options);
  this.s.op = 'find';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

functions._find = function() {
  var _this = this
  return new Promise((resolve, reject) => {
    _this.s.collection.
      find(_this.s.filter || {}, _this.s.options || {}).
      toArray(function(error, docs) {
        if (error) {
          reject(error);
          return;
        }
        debug('result:', docs);
        resolve(_.map(docs, (v) => {
          return _this.s.model(v, false);
        }));
      });
  });
};

functions.findOne = function(filter, options) {
  this.s.op = 'findOne';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

functions._findOne = function() {
  return this.s.collection.findOne(this.s.filter, this.s.options);
};

functions.exec = function() {
  debug('exec:', this.s.op);
  return this['_' + this.s.op]();
};

function merge(dest, src) {
  if (!src) {
    return;
  }
  var keys = Object.keys(src);
  for (var i = 0; i < keys.length; ++i) {
    _.set(dest, keys[i], src[keys[i]]);
  }
}
