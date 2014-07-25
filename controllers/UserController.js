var crypto          = require( 'crypto' )
  , qs              = require( 'qs' )
  , Promise         = require( 'bluebird' )
  , async           = require( 'async' );

module.exports = function( config, Controller, passport, UserService ) {
    var authConfig = config[ 'clever-auth' ]
      , routesRequiringLogin = {
            all: true,
            postAction: false
        };

    passport.serializeUser( function( user, done ) {
        done( null, user );
    });

    passport.deserializeUser( function( user, done ) {
        done( null, user )
    });

    if ( !authConfig.enabledStrategies || !!authConfig.enabledStrategies.local ) {
        routesRequiringLogin.loginAction = false;

        var LocalStrategy = require( 'passport-local' ).Strategy;
        passport.use( new LocalStrategy( function( username, password, done ) {
            var credentials = {
                email: username,
                password: crypto.createHash( 'sha1' ).update( password ).digest( 'hex' ),
                confirmed: true,
                active: true
            };

            UserService.authenticate( credentials )
                .then( done.bind( null, null ) )
                .catch( done );
        }));
    }

    if ( !!authConfig.enabledStrategies && !!authConfig.enabledStrategies.google ) {
        var GoogleStrategy  = require( 'passport-google' ).Strategy
          , googleConfig    = authConfig.enabledStrategies.google;

        // Allow the user to hit the return url without authentication
        routesRequiringLogin[ googleConfig.returnUrl.split( '/' ).pop() + 'Action' ] = false;
        routesRequiringLogin.googleLoginAction = false;

        passport.use(
            new GoogleStrategy({
                returnURL: googleConfig.returnUrl,
                realm: googleConfig.realm
            },
            function( identifier, user, done ) {
                UserService
                    .find({
                        email: user.emails[ 0 ].value
                    })
                    .then( function( userModel ) {
                        UserService
                            .authenticate( userModel )
                            .then( done.bind( null, null ) )
                            .catch( done );
                    })
                    .catch( function() {
                        UserService
                            .create({
                                email:              user.emails[ 0 ].value,
                                firstName:          user.name.givenName,
                                lastName:           user.name.familyName,
                                googleIdentifier:   identifier,
                                password:           'google'
                            })
                            .then( function( userModel ) {
                                if ( !!userModel.statusCode && !!userModel.message ) {
                                    return done( userModel.message );
                                }

                                UserService
                                    .authenticate( { email: userModel.email, password: 'google' } )
                                    .then( done.bind( null, null ) )
                                    .catch( done );
                            })
                            .catch( done );
                    })
            }
        ));
    }

    var UserController = Controller.extend({
        autoRouting: [
            function( req, res, next ) {
                return UserController.requiresLogin( routesRequiringLogin )( req, res, next );
            }
        ],

        service: UserService,

        requiresLogin: function( requiredRoutes ) {
            /*
                UserController.requiresPermission( true ); // Or false
                // or
                UserController.requiresPermission( { all: true, postAction: false } );
            */
            if ( typeof requiredRoutes !== 'object' ) {
                requiredRoutes = {
                    all: [ requiredRoutes !== undefined ? requiredRoutes : true ]
                }
            }

            return function( req, res, next ) {
                var method          = req.method.toLowerCase()
                  , action          = req.params.action
                  , requiresLogin   = false;

                if ( !action && method === 'get' && /^\/[^\/]+\/?$/ig.test( req.url ) ) {
                    action = 'list';
                } else if ( /^[0-9a-fA-F]{24}$/.test( action ) || !isNaN( action ) ) {
                    action = 'get';
                }

                async.waterfall(
                    [
                        function routeRequiresLogin( callback ) {
                            var actionName = ( !!action ? action : method ) + 'Action';

                            if ( typeof requiredRoutes[ actionName ] !== 'undefined' ) {
                                if ( requiredRoutes[ actionName ] !== null ) {
                                    if ( requiredRoutes[ actionName ] === true ) {
                                        requiresLogin = true;
                                    }
                                }
                            } else if ( typeof requiredRoutes.all !== 'undefined' ) {
                                if ( requiredRoutes.all === true ) {
                                    requiresLogin = true;
                                }
                            }

                            callback( null, requiresLogin );
                        },

                        function authenticationChecker( requiresLogin, callback ) {
                            if ( requiresLogin === true ) {
                                if ( req.isAuthenticated() ) {
                                    callback( null );
                                } else {
                                    callback( 'User is not authenticated!' );
                                }
                            } else {
                                callback( null );
                            }
                        }
                    ],
                    function( err ) {
                        if ( err === null ) {
                            next();
                        } else {
                            res.send( 401, { statusCode: 401, message: err } );
                        }
                    }

                );
            }
        },

        requiresUniqueUser: function( req, res, next ){
            var email = req.body.email;

            UserService
                .find({
                    where: {
                        email: email
                    }
                })
                .then( function( result ){
                    if( result.length ){
                        return res.json( 403, { error: 'This email "' + email + '" is already taken' } );
                    }
                    next();
                })
                .catch( function(err){
                    return res.json( 500, { error: 'There was an error: ' + err } );
                });
        },

        requiresAdminRights: function ( req, res, next ) {

            if ( !req.isAuthenticated() || !req.session.passport.user || !req.session.passport.user.hasAdminRight ) {
                return res.send( 401 );
            }

            next();
        }, //tested

        checkPasswordRecoveryData: function ( req, res, next ) {
            var userId = req.body.userId
              , password = req.body.password
              , token = req.body.token

            if ( !userId ) {
                return res.send( 400, 'Invalid user Id.' );
            }

            if ( !token ) {
                return res.send( 400, 'Invalid Token.' );
            }

            if ( !password ) {
                return res.send( 400, 'Password does not much the requirements' );
            }

            next();
        } //tested
    },
    {
        getAction: function () {
            if ( !!this.req.params.id ) {
                UserService.find( this.req.params.id )
                    .then( this.proxy( 'handleServiceMessage' ) )
                    .catch( this.proxy( 'handleException' ) );
            } else {
                this.listAction();
            }
        }, //tested

        postAction: function () {
            var data = this.req.body;

            if ( data.id ) {
                return this.putAction();
            }

            if ( !data.email ) {
                this.send( 'Email is mandatory', 400 );
                return;
            }

            var tplData = {
                firstName: data.firstname,
                userEmail: data.email,
                tplTitle: 'User Confirmation',
                subject: data.firstname || data.email + ' wants to add you to their recruiting team!'
            };

            UserService
                .create( data, tplData )
                .then( this.proxy( 'loginUserJson' ) )
                .catch( this.proxy( 'handleException' ) );
        }, //tested without email confirmation

        putAction: function () {
            UserService
                .update( this.req.params.id, this.req.body )
                .then( this.proxy( 'handleSessionUpdate' ) )
                .catch( this.proxy( 'handleException' ) );
        }, //tested

        deleteAction: function( req, res ) {
            UserService
                .destroy( this.req.params.id, this.req.body )
                .then( this.proxy( !!(this.req.params.id === this.req.user.id) ? 'logoutAction' : 'handleServiceMessage' ) )
                .catch( this.proxy( 'handleException' ) );
        },

        handleSessionUpdate: function ( user ) {
            if ( user.id && ( this.req.user.id === user.id ) ) {
                this.loginUserJson ( user );
                return;
            }

            this.handleServiceMessage( user );
        }, //tested through putAction

        loginAction: function () {
            passport.authenticate( 'local', this.proxy( 'handleLocalUser' ) )( this.req, this.res, this.next );
        }, //tested

        googleLoginAction: function () {
            passport.authenticate( 'google', this.proxy( 'handleLocalUser' ) )( this.req, this.res, this.next );
        }, //tested

        handleGoogleUser: function() {

        },

        googleLoginReturnAction: function () {
            passport.authenticate( 'google', this.proxy( 'handleLocalUser' ) )( this.req, this.res, this.next );
        },

        handleLocalUser: function ( err, user ) {
            if ( err ) {
                return this.handleException( err );
            }
            if ( !user ) {
                return this.send( {}, 403 );
            }

            this.loginUserJson( user );
        }, //tested through loginAction

        loginUserJson: function ( user ) {
            this.req.login( user, this.proxy( 'handleLoginJson', user ) );
        }, //tested through loginAction,  putAction, currentAction

        handleLoginJson: function ( user, err ) {
            if ( err ) {
                return this.handleException( err );
            }
            this.send( user, 200 );
        }, //tested through loginAction,  putAction

        currentAction: function () {
            var user = this.req.user
              , reload = this.req.query.reload || false;

            if ( !user ) {
                this.send( {}, 404 );
                return;
            }

            if ( !reload ) {
                this.send( user, 200 );
                return;
            }

            UserService
                .find( user.id )
                .then( this.proxy( 'loginUserJson' ) )
                .catch( this.proxy( 'handleException' ) );

        }, //tested

        logoutAction: function () {
            this.req.logout();
            this.res.send( {}, 200 );
        }, //tested

        recoverAction: function () {
            var email = this.req.body.email;

            if ( !email ) {
                this.send( 'missing email', 400 );
                return;
            }

            UserService
                .find( { where: { email: email } } )
                .then( this.proxy( 'handlePasswordRecovery' ) )
                .catch( this.proxy( 'handleException' ) );
        },

        handlePasswordRecovery: function ( user ) {

            if ( !user.length ) {
                this.send( {}, 403 );
                return;
            }

            UserService
                .generatePasswordResetHash( user[0] )
                .then( this.proxy( 'handleMailRecoveryToken' ) )
                .catch( this.proxy( 'handleException' ) );

        },

        handleMailRecoveryToken: function ( recoverData ) {

            if ( !recoverData.hash && recoverData.statuscode ) {
                this.handleServiceMessage( recoverData );
                return;
            }

            UserService
                .mailPasswordRecoveryToken( recoverData )
                .then( this.proxy( "handleServiceMessage" ) )
                .catch( this.proxy( "handleException" ) );
        },

        resetAction: function () {
            var userId = this.req.body.userId || this.req.body.user,
                password = this.req.body.password,
                token = this.req.body.token;

            UserService
                .findById( userId )
                .then( this.proxy( 'handlePasswordReset', password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        handlePasswordReset: function ( password, token, user ) {

            if ( !user ) {
                this.send( {}, 403 );
                return;
            }

            UserService
                .generatePasswordResetHash( user )
                .then( this.proxy( 'verifyResetTokenValidity', user, password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        verifyResetTokenValidity: function ( user, newPassword, token, resetData ) {

            if ( !resetData.hash && resetData.statuscode ) {
                this.handleServiceMessage( resetData );
                return;
            }

            var hash = resetData.hash;
            if ( token != hash ) {
                return this.send( 'Invalid token', 400 );
            }

            this.handleUpdatePassword( newPassword, [user] );

        },

        handleUpdatePassword: function ( newPassword, user ) {

            if ( user.length ) {
                user = user[0];
                user.updateAttributes( {
                    password: crypto.createHash( 'sha1' ).update( newPassword ).digest( 'hex' )
                } ).success( function ( user ) {
                        this.send( {status: 200, results: user} );
                    }.bind( this )
                    ).catch( this.proxy( 'handleException' ) );
            } else {
                this.send( {status: 400, error: "Incorrect old password!"} );
            }
        },

        confirmAction: function () {
            var password = this.req.body.password
              , token = this.req.body.token
              , userId = this.req.body.userId;


            UserService.findById( userId )
                .then( this.proxy( 'handleAccountConfirmation', password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        handleAccountConfirmation: function ( pass, token, user ) {
            if ( !user ) {
                this.send( 'Invalid confirmation link', 403 );
                return;
            }
            if ( user.confirmed ) {
                this.send( 'You have already activated your account', 400 );
                return;
            }

            UserService.generatePasswordResetHash( user )
                .then( this.proxy( "confirmAccount", user, pass, token ) )
                .catch( this.proxy( "handleException" ) );

        },

        confirmAccount: function ( user, pass, token, hashobj ) {

            if ( !hashobj.hash && hashobj.statuscode ) {
                this.handleServiceMessage( hashobj );
                return;
            }

            if ( token !== hashobj.hash ) {
                this.send( 'Invalid token', 400 );
                return;
            }

            var newpass = crypto.createHash( 'sha1' ).update( pass ).digest( 'hex' );

            user
                .updateAttributes( {
                    active: true,
                    confirmed: true,
                    password: newpass
                } )
                .success( this.proxy( 'send', 200 ) )
                .error( this.proxy( 'handleException' ) );

        },

        resendAction: function () {
            var me      = this.req.user
              , userId  = this.req.params.id;

            var tplData = {
                firstName: this.req.user.firstname,
                accountSubdomain: this.req.user.account.subdomain,
                userFirstName: '',
                userEmail: '',
                tplTitle: 'Account Confirmation',
                subject: this.req.user.firstname + ' wants to add you to their team!'
            };

            UserService
                .resendAccountConfirmation( me.account.id, userId, tplData )
                .then( this.proxy( 'handleServiceMessage' ) )
                .then( this.proxy( 'handleException' ) );

        }

    });

    return UserController;  
};
