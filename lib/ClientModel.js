'use strict';

const Model = require('./Model');

class ClientModel extends Model {
  constructor(apiRoot, schema) {
    super(schema);
    this.apiRoot = apiRoot;
  }
}

module.exports = ClientModel;
