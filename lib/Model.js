'use strict';

const cast = require('./cast');
//const validate = require('./validate');

class Model {
  constructor(schema) {
    this.schema = schema;
  }

  cast(doc) {
    return cast(doc, this.schema);
  }

  /*validate(doc) {
    return validate(doc, this.schema);
  }*/
}

module.exports = Model;
