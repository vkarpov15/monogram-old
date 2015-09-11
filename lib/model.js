var _ = require('lodash');
var bind = require('./utils').bind;
var composition = require('composition');
var debug = require('debug')('monogram:model:debug');
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

      if (options.schema && options.schema.middleware('$save')) {
        save = composition(options.schema.middleware('$save').concat([save]));
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

  context.model = model;
  context.Query = new Query(model, options.schema, context.collection);

  _.each(functions, function(fn, key) {
    model[key] = bind(fn, context);
  });
  return model;
}

var functions = {};

functions.count = function(filter, options) {
  var q = new this.Query(this.model, this.collection);
  return q.count(filter, options);
};

functions.distinct = function(fieldName, filter, options) {
  var q = new this.Query(this.model, this.collection);
  return q.distinct(filter, options);
}

functions.find = function(filter, options) {
  debug('find:', filter, options);
  var q = new this.Query(this.model, this.collection);
  return q.find(filter, options);
};

functions.findOne = function(filter, options) {
  var q = new this.Query(this.model, this.collection);
  return q.findOne(filter, options);
};

functions.deleteOne = function*(query) {
  return yield this.collection.deleteOne(query);
};

functions.deleteMany = function*(query) {
  return yield this.collection.deleteMany(query);
};

functions.updateOne = function*(filter, update, options) {
  return yield this.collection.updateOne(filter, update, options);
};

functions.updateMany = function*(filter, update, options) {
  return yield this.collection.updateMany(filter, update, options);
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
