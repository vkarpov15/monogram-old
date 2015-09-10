var _ = require('lodash');

module.exports = Query;

function Query(model, collection) {
  this.s = {
    collection: collection,
    filter: null,
    model: model,
    update: null,
    op: null,
    options: null
  };
}

Query.prototype.count = function(filter, options) {
  this.s.op = 'count';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

Query.prototype._count = function*() {
  return yield this.s.collection.count(this.s.filter, this.s.options);
};

Query.prototype.find = function(filter, options) {
  this.s.op = 'find';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

Query.prototype._find = function*() {
  return yield this.s.collection.find(this.s.filter, this.s.options);
};

Query.prototype.findOne = function(filter, options) {
  this.s.op = 'findOne';
  merge(this.s.filter, filter);
  merge(this.s.options, options);
  return this;
};

Query.prototype._findOne = function*() {
  return yield this.s.collection.findOne(this.s.filter, this.s.options);
};

Query.prototype.exec = function*() {
  return yield this['_' + this.s.op]();
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
