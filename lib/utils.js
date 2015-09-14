exports.bind = function(fn, context) {
  return function() {
    return fn.apply(context, arguments);
  };
};

exports.defineMethod = function(obj, name, fn) {
  Object.defineProperty(obj, name, {
    enumerable: false,
    configurable: true,
    writable: false,
    value: fn
  });
};
