var dot = require('dot-component');
var mongodb = require('mongodb');

function Document(obj, isNew) {
  var delta = { $set: {}, $unset: {} };

  obj.$delta = function() {
    return new Promise(function(resolve, reject) {
      setImmediate(function() {
        resolve(delta);
      });
    });
  }

  if (!isNew) {
    _observe(obj, delta);
  }

  return obj;
}

function _observe(obj, delta, path) {
  path = path ? path + '.' : '';

  Object.observe(obj, function(changes) {
    changes.forEach(function(change) {
      switch (change.type) {
        case 'add':
        case 'update':
          dot.set(delta.$set, path + change.name, obj[change.name]);
          if (typeof obj[change.name] === 'object') {
            _observe(obj[change.name], delta, path + change.name);
          }
          break;
        case 'delete':
          const re = new RegExp('^' + path + change.name);
          for (var key of Object.keys(delta.$unset)) {
            if (re.test(key)) {
              delete delta.$unset[key];
            }
          }
          delta.$unset[path + change.name] = true;
          if (typeof delta.$set[path + change.name] === 'object') {
            Object.unobserve(obj[change.name]);
          }
          delete dot.parent(delta.$set, path + change.name)[change.name];
          break;
        default:
          break;
      }
    });
  });
}

exports.Document = Document;
