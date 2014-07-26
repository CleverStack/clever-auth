var crypto          = require( 'crypto' )
  , injector        = require( 'injector' )
  , LocalStrategy   = require( 'passport-local' ).Strategy;

module.exports = function( config, Controller, passport, UserService, UserController, UserModel ) {
    injector.instance( 'LocalStrategy', LocalStrategy );

    var AuthController = Controller.extend({

        restfulRouting: false,

        route: '/auth',

        autoRouting: [
            UserController.requiresLogin({
                all: true,
                signInAction: false,
                sessionAction: false
            })
        ],

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
                    this.handleException( err );
                } else {
                    this.send( user, 200 );
                }
            }));
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
                .catch( this.proxy( 'handleException' ) );
        },

        signInAction: function () {
            passport.authenticate( 'local', this.proxy( AuthController.authenticate ) )( this.req, this.res, this.next );
        },

        signOutAction: function () {
            this.req.logout();
            this.res.send( {}, 200 );
        },

        updateSession: function() {
            if ( user.id && ( this.req.user.id === user.id ) ) {
                this.req.user = user;
                return;
            }

            this.handleServiceMessage( user );
        }
    });

    passport.use( new LocalStrategy( AuthController.callback( 'localAuth' ) ) );
    // UserController.on( 'signIn', function( user, scope ) {
    //     AuthController.prototype.authenticate.apply( scope, [ user ] );
    // });

    return AuthController;
};