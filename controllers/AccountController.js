var injector    = require( 'injector' )
  , packageJson = injector.getInstance( 'packageJson' );

if ( packageJson.bundledDependencies.indexOf( 'clever-roles' ) !== -1 ) {
    module.exports = function( Controller, AccountService, config, async, PermissionController ) {
        return define( Controller, AccountService, config, async, PermissionController );
    };
} else {
    module.exports = function( Controller, AccountService, config, async ) {
        return define( Controller, AccountService, config, async, null );
    };
}

function define( Controller, AccountService, config, async, PermissionController ) {
    var autoRouting = [];

    if ( PermissionController !== null ) {
        autoRouting.push(
            PermissionController.requiresPermission({
                all: 'Account.$action',
                postAction: null
            })
        );
    }


    var AccountController = Controller.extend(
    /** @Class **/
    {
        service: AccountService,

        route: [
            '[POST] /account/?',
            '/account/:id/?',
            '/account/:id/:action((?!(role|roles|permission|permissions|user|users|subscription|subscriptions)).)*/?',
            '/accounts/?',
            '/accounts/:action/?'
        ],

        autoRouting: autoRouting,

        /**
         * Middleware helper function to format data in POST or PUT requests
         * 
         * @param  {Request}  req  The Request Object
         * @param  {Response} res  The response object
         * @param  {Function} next Continue past this middleware
         * @return {void}
         */
        formatData: function( req, res, next ) {
            var accData = req.user.Account
              , newData = {
                    name:       req.body.name       || accData.name,
                    logo:       req.body.logo       || accData.logo,
                    info:       req.body.info       || accData.info,
                    email:      req.body.email      || accData.email,
                    themeColor: req.body.themeColor || accData.themeColor
                };

            req.body = newData;
            next();
        },

        /**
         * Middleware helper function for requiring a unique subDomain for a given POST request
         * 
         * @param  {Request}  req  The Request Object
         * @param  {Response} res  The response object
         * @param  {Function} next Continue past this middleware
         * @return {void}
         */
        requiresUniqueSubdomain: function( req, res, next ){
            var subdomain = req.body.subdomain;

            if ( !subdomain ) {
                return res.json( 400, "Company subdomain is mandatory!" );
            }

            AccountService
                .find({
                    where: {
                        subdomain: subdomain
                    }
                })
                .then( function( result ){
                    if( result.length ){
                        return res.json( 403, 'This URL "' + subdomain + '" is already taken' );
                    }
                    next();
                })
                .catch( function(){
                    return res.json( 500, 'There was an error: ' + err );
                });
        },

        isValidEmailDomain : function( req, res, next ){
            if ( !!config[ 'clever-subscription' ].account.enabled ) {
                var data = req.body
                  , pattern = new RegExp( config[ 'clever-subscription' ].account.blockedEmailDomains );

                if( !data.email ){
                    res.send(400, 'Email is mandatory' );
                    return;
                }

                if( pattern.test( data.email ) ){
                    return res.send( 400, 'Please register with your corporate email address.' );
                }

                next();
            } else {
                next();
            }
        },

        // Middleware
        addAccountIdToRequest: function( requiredRoutes ) {
            if ( typeof requiredRoutes !== 'object' ) {
                requiredRoutes = {
                    all: [ requiredRoutes !== undefined ? requiredRoutes : true ]
                }
            }

            return function( req, res, next ) {
                var method          = req.method.toLowerCase()
                  , user            = req.user
                  , isAdmin         = !!user ? !!user.hasAdminRight : false
                  , action          = req.params.action ? req.params.action.toLowerCase() : false
                  , accountId       = ( method === 'post' ) ? req.body.AccountId : ( req.query.AccountId || parseInt( req.params.AccountId, 10 ) )
                  , routeEnabled    = false;

                if ( !req.query.AccountId && !!accountId ) {
                    req.query.AccountId = accountId;
                }

                if ( !action && method === 'get' && /^\/[^\/]+\/?$/ig.test( req.url ) ) {
                    action = 'list';
                } else if ( /^[0-9a-fA-F]{24}$/.test( action ) || !isNaN( action ) ) {
                    action = 'get';
                }

                async.waterfall(
                    [
                        function isRouteEnabled( callback ) {
                            var actionName = ( !!action ? action : method ) + 'Action';

                            if ( typeof requiredRoutes[ actionName ] !== 'undefined' ) {
                                if ( requiredRoutes[ actionName ] !== null ) {
                                    if ( requiredRoutes[ actionName ] === true ) {
                                        routeEnabled = true;
                                    }
                                }
                            } else if ( typeof requiredRoutes.all !== 'undefined' ) {
                                if ( requiredRoutes.all === true ) {
                                    routeEnabled = true;
                                }
                            }

                            callback( null );
                        },

                        function addAccountIdToRequest( callback ) {
                            if ( routeEnabled === true ) {

                                if ( !user ) {
                                    
                                    callback( 'Unknown user' );

                                } else {

                                    if ( method === 'post' || method === 'put' ) {
                                        if ( !isAdmin || ( !!isAdmin && !accountId ) ) {
                                            req.body[ !/^[0-9a-fA-F]{24}$/.test( user.Account.id ) ? 'AccountId' : 'Account' ]  = user.Account.id || user.Account._id;
                                        }
                                    } else {
                                        if ( !isAdmin || ( !!isAdmin && !accountId ) ) {
                                            req.query[ !/^[0-9a-fA-F]{24}$/.test( user.Account.id ) ? 'AccountId' : 'Account' ] = user.Account.id || user.Account._id;
                                        }
                                    }

                                    callback( null );
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
            };
        }
    },
    /** @Prototype **/
    {
        listAction: function() {
            if ( this.req.query.AccountId !== undefined && this.req.query.AccountId != this.req.user.Account.id ) {
                return this.send( 200, [] );
            }
            if ( !this.req.user || !this.req.user.hasAdminRight ) {
                this.req.query.id = this.req.user.Account.id;
            }
            this._super.apply( this, arguments );
        },

        getAction: function() {
            if ( this.req.query.AccountId !== undefined && this.req.query.AccountId != this.req.user.Account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this.req.query.id = this.req.user.Account.id;
            this._super.apply( this, arguments );
        },

        putAction: function() {
            if ( this.req.query.AccountId !== undefined && this.req.query.AccountId != this.req.user.Account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this.req.query.id = this.req.user.Account.id;
            this._super.apply( this, arguments );
        },

        deleteAction: function() {
            if ( this.req.query.AccountId !== undefined && this.req.query.AccountId != this.req.user.Account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this.req.query.id = this.req.user.Account.id;
            this._super.apply( this, arguments );
        }
    });

    return AccountController;
}
