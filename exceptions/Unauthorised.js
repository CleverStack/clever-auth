function Unauthorised( message ) {
    Error.call( this );
    Error.captureStackTrace( this, this.constructor );

    this.name       = this.constructor.name;
    this.message    = message;
    this.statusCode = 401;
}

require( 'util' ).inherits( Unauthorised, Error );

module.exports = Unauthorised;
