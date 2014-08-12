var crypto = require( 'crypto' );

module.exports = function( Controller, UserService, Exceptions, config, passport, async ) {
    var UserController = Controller.extend({
        
        /**
         * Pass the user service to CleverStacks Controller
         * @type {Service}
         */
        service: UserService,

        /**
         * Provide the routes that this Controller is accessible from
         * @type {Array}
         */
        route: [
            '[POST] /auth/user/?',
            '/auth/user/:id/?',
            '/auth/user/:id/:action/?',
            '/auth/users/?',
            '/auth/users/:action/?'
        ],
        
        /**
         * Configure Controller's autoRouting middleware
         * @type {Array}
         */
        autoRouting: [

            /**
             * Because we are defining the UserController we have to wrap the middleware call to requiresLogin
             * 
             * @param  {Request}    req  the request object
             * @param  {Response}   res  the response object
             * @param  {Function}   next connect next()
             * @return {Object}          routes object containing settings
             */
            function( req, res, next ) {
                return UserController.requiresLogin( config[ 'clever-auth' ].requiresLogin )( req, res, next );
            }
        ],

        /**
         * Passport serialize function
         * 
         * @param  {Object}   user The signed on user
         * @param  {Function} done complete the serialization
         * @return {undefined}
         */
        serializeUser: function( user, done ) {
            done( null, user );
        },

        /**
         * Passport deserialize function
         * 
         * @param  {Object}   user the signed on user
         * @param  {Function} done complete the deserialization
         * @return {undefined}
         */
        deserializeUser: function( user, done ) {
            done( null, user );
        },

        /**
         * Middleware that can be used to define login requirements for actions based on routes
         *
         * Examples:
         *     UserController.requiresPermission()
         *     UserController.requiresPermission( true )
         *     UserController.requiresPermission( {
         *         all: true,
         *         getAction: false
         *     })
         * 
         * @param  {Mixed} requiredRoutes undefined, boolean true or false and { getAction: true } are all valid values
         * @return {undefined}
         */
        requiresLogin: function( requiredRoutes ) {
            if ( typeof requiredRoutes !== 'object' ) {
                requiredRoutes = {
                    all: [ requiredRoutes !== undefined ? requiredRoutes : true ]
                }
            }

            return function( req, res, next ) {
                var method          = req.method.toLowerCase()
                  , action          = req.params.action ? req.params.action.toLowerCase() : false
                  , id              = req.params.id
                  , requiresLogin   = false;

                if ( !!id && !!action && action === 'list' ) {
                    action = 'get'
                    req.params.action = 'get';
                } else if ( !action && method === 'get' && /^\/.*\/(.*\/?)$/ig.test( req.url ) ) {
                    action = 'list';
                } else if ( /^[0-9a-fA-F]{24}$/.test( action ) || !isNaN( action ) ) {
                    action = 'get';
                } else {
                    if ( req.params.action ) {
                        action = req.params.action;
                    } else if ( method === 'get' && !id ) {
                        action = 'list';
                    } else {
                        action = method;
                    }
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

        /**
         * Middleware that can be used to define the signed in users administration permission requirements for actions based on routes
         *
         * Examples:
         *     UserController.requiresAdminRights()
         *     UserController.requiresAdminRights( true )
         *     UserController.requiresAdminRights( {
         *         all: true,
         *         getAction: false
         *     })
         * 
         * @param  {Mixed} requiredRoutes undefined, boolean true or false and { getAction: true } are all valid values
         * @return {undefined}
         */
        requiresAdminRights: function( requiredRoutes ) {
            if ( typeof requiredRoutes !== 'object' ) {
                requiredRoutes = {
                    all: [ requiredRoutes !== undefined ? requiredRoutes : true ]
                }
            }

            return function( req, res, next ) {
                var method          = req.method.toLowerCase()
                  , action          = req.params.action ? req.params.action.toLowerCase() : false
                  , id              = req.params.id
                  , requiresLogin   = false;

                if ( !!id && !!action && action === 'list' ) {
                    action = 'get'
                    req.params.action = 'get';
                } else if ( !action && method === 'get' && /^\/.*\/(.*\/?)$/ig.test( req.url ) ) {
                    action = 'list';
                } else if ( /^[0-9a-fA-F]{24}$/.test( action ) || !isNaN( action ) ) {
                    action = 'get';
                } else {
                    if ( req.params.action ) {
                        action = req.params.action;
                    } else if ( method === 'get' && !id ) {
                        action = 'list';
                    } else {
                        action = method;
                    }
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
                                if ( req.isAuthenticated() && !!req.session.passport.user.hasAdminRight ) {
                                    callback( null );
                                } else {
                                    callback( 'User does not have administration rights!' );
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
        }, // @TODO this doesn't work?
        
        /**
         * Middleware that can be used on any single route to check that password recovery data has been provided
         * 
         * @param  {Request}    req  the request object
         * @param  {Response}   res  the response object
         * @param  {Function}   next connect next()
         * @return {undefined}
         */
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
                return res.send( 400, 'Password does not match the requirements' );
            }

            next();
        } // @TODO is this actually needed? i doubt it
    },
    {
        /**
         * Handles POST /auth/user or POST /auth/users, this function will use the UserService to create a new User.
         * @return {undefined}
         */
        postAction: function () {
            if ( !!this.req.body.id || !!this.req.params.id ) {
                this.action = 'putAction';
                if ( !this.req.params.id ) {
                    this.req.params.id = this.req.body.id;
                    delete this.req.body.id;
                }
                return this.putAction();
            }

            UserService
                .create( this.req.body )
                .then( this.proxy( function( user ) {
                    require( 'clever-auth' ).controllers.AuthController.authenticate.apply( this, [ null, user ] );
                }))
                .catch( this.proxy( 'handleServiceMessage' ) )
        },

        /**
         * Handles PUT /auth/user/:id or GET/PUT /auth/user/:id/put, this function will use the UserService to update an existing user
         * @return {undefined}
         */
        putAction: function () {
            UserService
                .update( this.req.params.id, this.req.body )
                .then( this.proxy( function( user ) {
                    require( 'clever-auth' ).controllers.AuthController.updateSession.apply( this, [ user ] );
                }))
                .catch( this.proxy( 'handleServiceMessage' ) )
        },

        /**
         * Handles DELETE /auth/user/:id or GET/DELETE /auth/user/:id/delete, this function will use the UserService to delete an existing user
         * @return {undefined}
         */
        deleteAction: function() {
            UserService
                .destroy( this.req.params.id, this.req.body )
                .then( this.proxy( function() {
                    if ( this.req.params.id === this.req.user.id ) {
                        require( 'clever-auth' ).controllers.AuthController.signOut.apply( this, arguments );
                    } else {
                        this.handleServiceMessage.apply( this, arguments );
                    }
                }))
                .catch( this.proxy( 'handleException' ) );
        },

        /**
         * Allows a user to request a password recovery (reset) email be sent to them
         * @return {undefined}
         */
        recoverAction: function() {
            if ( !this.req.body.email ) {
                throw new Exceptions.InvalidData( 'You must provide your Email Address.' );
            }

            UserService
                .recoverPassword( this.req.body.email )
                .then( this.proxy( 'handlePasswordRecovery' ) )
                .catch( this.proxy( 'handleException' ) );
        },

        /**
         * Allows users to post their recoveryToken to reset their password
         * @return {undefined}
         */
        resetAction: function() {
            var userId    = this.req.body.id || this.req.body.user,
                password  = this.req.body.password,
                token     = this.req.body.token;

            UserService
                .findById( userId )
                .then( this.proxy( 'handlePasswordReset', password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        handlePasswordReset: function( password, token, user ) {
            if ( !user ) {
                this.send( {}, 403 );
                return;
            }

            UserService
                .generatePasswordResetHash( user )
                .then( this.proxy( 'verifyResetTokenValidity', user, password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        verifyResetTokenValidity: function( user, newPassword, token, resetData ) {
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

        handleUpdatePassword: function( newPassword, user ) {

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

        confirmAction: function() {
            var password = this.req.body.password
              , token = this.req.body.token
              , userId = this.req.body.userId;


            UserService.findById( userId )
                .then( this.proxy( 'handleAccountConfirmation', password, token ) )
                .catch( this.proxy( 'handleException' ) );

        },

        handleAccountConfirmation: function( pass, token, user ) {
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

        confirmAccount: function( user, pass, token, hashobj ) {
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

        resendAction: function() {
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

    passport.serializeUser( UserController.callback( 'serializeUser' ) );
    passport.deserializeUser( UserController.callback( 'deserializeUser' ) );

    return UserController;  
};
