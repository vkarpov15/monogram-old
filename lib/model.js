var _ = require('lodash');
var Document = require('./document');

module.exports = ModelFactory;

function ModelFactory(db, options) {
  if (typeof options === 'string') {
    options = { collection: options };
  }

  var context = {
    db: db,
    options: options,
    collection: db.collection(options.collection)
  };

  var ret = function(doc) {
    var d = new Document(doc, true);

    d.$save = function*() {
      return yield context.collection.insert(_.pick(d, function(val, key) {
        return !(val instanceof Function);
      }));
    };

    return d;
  };
  _.each(functions, function(fn, key) {
    ret[key] = fn.bind(context);
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
    doc = new Document(doc, false);
    doc.$ignore(function() {
      doc.$save = function*() {
        return yield _this.collection.update({ _id: doc._id },
          clean(doc.$delta()));
      };
    });

    return doc;
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
