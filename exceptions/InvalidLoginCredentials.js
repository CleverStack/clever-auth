function InvalidLoginCredentials(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  this.name       = this.constructor.name;
  this.message    = message;
  this.statusCode = 400;
}

require('util').inherits(InvalidLoginCredentials, Error);

module.exports    = InvalidLoginCredentials;
