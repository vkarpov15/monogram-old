var _ = require('lodash');
var bind = require('./utils').bind;
var compose = require('koa-compose');
var Document = require('./document');

module.exports = ModelFactory;

function ModelFactory(db, options) {
  if (typeof options === 'string') {
    options = { collection: options };
  }

  var context = {
    db: db,
    options: options,
    collection: db.collection(options.collection),
    schema: options.schema
  };

  var ret = function(doc, isNew) {
    Document(doc, arguments.length === 1 || !!isNew);

    doc.$ignore(function() {
      var save = function*() {
        if (doc.$isNew()) {
          yield context.collection.insert(doc);
          doc.$isNew(false);
        } else {
          var delta = clean(doc.$delta());
          if (!delta) {
            return;
          }
          return context.collection.update({ _id: doc._id }, delta);
        }
      };

      if (options.schema && options.schema.middleware('$save')) {
        save = compose(options.schema.middleware('$save').concat([save]));
      }

      Object.defineProperty(doc, '$save', {
        configurable: true,
        enumerable: false,
        writable: false,
        value: save
      });
    });

    return doc;
  };

  context.model = ret;

  _.each(functions, function(fn, key) {
    ret[key] = bind(fn, context);
  });
  return ret;
}

var functions = {};
functions.remove = function*(query) {
  return yield this.collection.remove(query);
};

functions.find = function*(query, options) {
  var _this = this;
  var docs = yield this.collection.find(query, options).toArray();
  return _.map(docs, function(doc) {
    return _this.model(doc, false);
  });
};

function clean(delta) {
  var clone = _.clone(delta);
  if (Object.keys(clone.$set).length === 0 &&
      Object.keys(clone.$unset).length === 0) {
    return;
  }
  if (Object.keys(clone.$set).length === 0) {
    delete clone.$set;
  }
  if (Object.keys(clone.$unset).length === 0) {
    delete clone.$unset;
  }
  return clone;
}
