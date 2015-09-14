var _ = require('lodash');
var composition = require('composition');
var debug = require('debug')('monogram:query:debug');

'use strict';

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

functions.findOne = function(filter, options) {
  this.s.op = 'findOne';
  this.s.filter = merge(this.s.filter, filter);
  this.s.options = merge(this.s.options, options);
  return this;
};

functions._findOne = function() {
  return this.s.collection.findOne(this.s.filter, this.s.options);
};

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
    _.set(dest, keys[i], src[keys[i]]);
  }
  return dest;
}
