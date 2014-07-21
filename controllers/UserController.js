var crypto          = require( 'crypto' )
  , qs              = require ( 'qs' )
  , LocalStrategy   = require( 'passport-local' ).Strategy
  , GoogleStrategy;

module.exports = function( config, Controller, passport, UserService ) {

    passport.serializeUser( function( user, done ) {
        done( null, user );
    });

    passport.deserializeUser( function( user, done ) {
        done( null, user )
    });

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

    if ( config[ 'clever-auth' ].enabledStrategies && config[ 'clever-auth' ].enabledStrategies.google ) {
        GoogleStrategy = require ( 'passport-google-oauth' ).OAuth2Strategy;
        passport.use( new GoogleStrategy(
            {
                clientID: config[ 'clever-auth' ].enabledStrategies.google.clientId,
                clientSecret: config[ 'clever-auth' ].enabledStrategies.google.clientSecret,
                callbackURL: config[ 'clever-auth' ].enabledStrategies.google.redirectURIs
            },
            function( accessToken, refreshToken, profile, done ) {

                UserService
                    .findOrCreate( profile, accessToken )
                    .then( function( user ) {
                        return UserService.authenticate( user, profile )
                    })
                    .then( UserGoogleService.updateAccessedDate )
                    .then( done.bind( null, null ) )
                    .catch( done );
            }
        ));
    }

    return Controller.extend(
        {
            autoRouting: [ 'requiresLogin' ],

            service: UserService,

            requiresLogin: function ( req, res, next ) {
                var parts = req.url ? req.url.split('/') : false
                  , action = parts && parts.length > 2 ? parts.pop() : false
                  , route = parts ? parts.pop() : false
                  , method = req.method ? req.method.toLowerCase() : false;
                
                if ( req.isAuthenticated() || ( route === 'user' && ( method === 'post' || action === 'login' || action === 'current' ) ) ) {
                    return next();
                }

                res.send( 401 );
            }, //tested

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
                var params = {
                    response_type: "code",
                    client_id: config[ 'clever-auth' ].enabledStrategies.google.clientId,
                    redirect_uri: config[ 'clever-auth' ].enabledStrategies.google.redirectURIs,
                    display: "popup",
                    scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
                };

                this.send( { url: 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify( params ) }, 200 );
            }, //tested

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
};
