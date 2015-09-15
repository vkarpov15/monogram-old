var _ = require('lodash');
var bind = require('./utils').bind;
var composition = require('composition');
var debug = require('debug')('monogram:model:debug');
var defineMethod = require('./utils').defineMethod;
var Document = require('./document');
var Query = require('./query');

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

  var model = function(doc, isNew) {
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

      defineMethod(doc, '$save', save);
      if (options.schema) {
        options.schema.applyMethods('document', doc);
        options.schema.applyMiddleware(doc);
      }
    });

    return doc;
  };

  context.model = model;
  context.Query = new Query(model, options.schema, context.collection);
  if (options.schema) {
    options.schema.applyMethods('query', context.Query.prototype);
    options.schema.applyMiddleware(context.Query.prototype, '_');
    options.schema.applyMethods('model', model);
  }

  _.each(functions, function(fn, key) {
    model[key] = bind(fn, context);
  });
  return model;
}

var functions = {};

[
  'count', 'distinct', 'find', 'findOne', 'deleteOne', 'deleteMany',
  'replaceOne', 'updateOne', 'updateMany', 'findOneAndDelete',
  'findOneAndReplace', 'findOneAndUpdate'
].forEach(function(key) {
  functions[key] = function() {
    var q = new this.Query(this.model, this.collection);
    return q[key].apply(q, arguments);
  };
});

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
