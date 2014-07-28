function UserNotActive( message ) {
	Error.call( this );
	Error.captureStackTrace( this, this.constructor );

	this.name = this.constructor.name;
    this.message = message;
    this.statusCode = 403;
}

require( 'util' ).inherits( UserNotActive, Error );

module.exports = UserNotActive;