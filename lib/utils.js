exports.bind = function(fn, context) {
  return function() {
    return fn.apply(context, arguments);
  };
};
