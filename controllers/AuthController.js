var crypto          = require( 'crypto' )
  , injector        = require( 'injector' )
  , LocalStrategy   = require( 'passport-local' ).Strategy;

module.exports = function( config, Controller, passport, UserService ) {
    injector.instance( 'LocalStrategy', LocalStrategy );

    var AuthController = Controller.extend({

        route: [
            '[GET,POST] /auth/?:action?'
        ],

        restfulRouting: false,

        localAuth: function( username, password, done ) {
            var credentials = {
                email: username,
                password: crypto.createHash( 'sha1' ).update( password ).digest( 'hex' ),
                confirmed: true,
                active: true
            };

            UserService.authenticate( credentials )
                .then(function( user ) {
                    done( null, JSON.parse( JSON.stringify( user ) ) )
                })
                .catch( done );
        },

        authenticate: function( err, user ) {
            if ( err !== null ) {
                return this.handleServiceMessage( { statusCode: 400, message: err } );
            }

            this.req.login( user, this.proxy( function( err ) {
                if ( err ) {
                    this.handleServiceMessage( err );
                } else {
                    this.send( user, 200 );
                }
            }));
        },

        signOut: function() {
            this.req.logout();
            this.send( {}, 200 );
        },

        updateSession: function( user ) {
            if ( user.id && ( this.req.user.id === user.id ) ) {
                AuthController.authenticate.apply( this, [ null, user ] );
                return;
            }

            this.send( user, 400 );
        },

        requiresAdmin: function( req, res, next ) {
            if ( req.isAuthenticated() ) {
                if ( !!req.user.hasAdminRight ) {
                    next();
                } else {
                    res.send( 403, { message: 'User is not authorized to perform that action' } );
                }
            } else {
                res.send( 401, { message: 'User is not authenticated' } );
            }
        }
    },
    {
        sessionAction: function() {
            var user    = this.req.user
              , reload  = this.req.query.reload || false;

            if ( !user ) {
                this.send( {}, 401 );
                return;
            }

            if ( !reload ) {
                this.send( user, 200 );
                return;
            }

            UserService
                .find( user.id )
                .then( this.proxy( 'updateSession' ) )
                .catch( this.proxy( 'handleServiceMessage' ) );
        },

        signInAction: function () {
            passport.authenticate( 'local', this.proxy( AuthController.authenticate ) )( this.req, this.res, this.next );
        },

        signOutAction: function () {
            this.Class.signOut.apply( this, [] );
        },

        updateSession: function( user ) {
            this.Class.updateSession.apply( this, [ user ] );
        }
    });

    passport.use( new LocalStrategy( AuthController.callback( 'localAuth' ) ) );

    return AuthController;
};
