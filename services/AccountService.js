var injector                = require( 'injector' )
  , packageJson             = injector.getInstance( 'packageJson' );

if ( packageJson.bundledDependencies.indexOf( 'clever-roles' ) !== -1 ) {
    module.exports = function( Promise, Service, AccountModel, UserService, async, config, _, PermissionService, RoleService ) {
        return define( Promise, Service, AccountModel, UserService, async, config, _, PermissionService, RoleService );
    };
} else {
    module.exports = function( Promise, Service, AccountModel, UserService, async, config, _ ) {
        return define( Promise, Service, AccountModel, UserService, async, config, _, null, null );
    };
}

function define( Promise, Service, AccountModel, UserService, async, config, _, PermissionService, RoleService ) {
    return Service.extend({

        model: AccountModel,

        create: function( data, options ) {
            var create      = this._super
              , service     = this
              , account     = null
              , permissions = []
              , role        = null
              , user        = null;

            options = options || {};

            return new Promise( function( resolve, reject ) {
                async.waterfall(
                    [
                        function startTransaction( callback ) {
                            service
                                .transaction( options )
                                .then( function() {
                                    callback( null );
                                })
                                .catch( callback );
                        },

                        function createAccount( callback ) {
                            var accountData = {
                                name:       data.company,
                                email:      data.email,
                                active:     RoleService !== null ? ( !config[ 'clever-roles' ].account.requireConfirmation ? true : false ) : true
                            };

                            if ( data.subDomain ) {
                                accountData.subDomain = data.subDomain;
                            } else if ( data.domain ) {
                                accountData.subDomain = data.domain.replace( 'http://', '' ).replace( 'www.', '' ).split( '.' )[ 0 ];
                            }

                            create
                                .apply( service, [ accountData, options ])
                                .then( function( _account ) {
                                    account = _account;
                                    callback( null );
                                })
                                .catch( callback )
                        },

                        function findDefaultPermissions( callback ) {
                            if ( PermissionService !== null ) {
                                PermissionService
                                    .findAll({
                                        where: {
                                            AccountId: null,
                                            systemPermission: true
                                        }
                                    }, options)
                                    .then( callback.bind( null, null ) )
                                    .catch( callback );
                            } else {
                                callback( null, null );
                            }
                        },

                        function createDefaultPermissions( defaultPermissions, callback ) {
                            if ( PermissionService !== null ) {
                                async.forEach(
                                    defaultPermissions,
                                    function createDefaultPermission( defaultPermission, done ) {
                                        PermissionService
                                            .create({
                                                AccountId:          account.id,
                                                action:             defaultPermission.action,
                                                description:        defaultPermission.description,
                                                systemPermission:   true
                                            }, options )
                                            .then( function( permission ) {
                                                permissions.push( permission );
                                                done( null );
                                            })
                                            .catch( done );
                                    },
                                    callback
                                );
                            } else {
                                callback( null );
                            }
                        },

                        function findDefaultRoles( callback ) {
                            if ( RoleService !== null ) {
                                RoleService
                                    .findAll({
                                        where: {
                                            AccountId:  null,
                                            systemRole: true
                                        }
                                    }, options )
                                    .then( callback.bind( null, null ) )
                                    .catch( callback );
                            } else {
                                callback( null, null );
                            }
                        },

                        function createDefaultRoles( defaultRoles, callback ) {
                            if ( RoleService !== null ) {
                                async.forEach(
                                    defaultRoles,
                                    function createDefaultRole( defaultRole, done ) {
                                        var rolePermissions = [];

                                        if ( defaultRole.Permissions ) {
                                            defaultRole.Permissions.forEach( function( rolePermission ) {
                                                var defaultPermission = _.findWhere( permissions, { action: rolePermission.action } );
                                                if ( defaultPermission ) {
                                                    rolePermissions.push( defaultPermission.id );
                                                }
                                            })
                                        }

                                        RoleService
                                            .create({
                                                AccountId:      account.id,
                                                systemRole:     true,
                                                name:           defaultRole.name,
                                                description:    defaultRole.description,
                                                Permissions:    rolePermissions
                                            }, options )
                                            .then( function( _role ) {
                                                // For now we get the first role and assign the user to that role
                                                if ( role === null ) {
                                                    role = _role;
                                                }
                                                done( null );
                                            })
                                            .catch( done );
                                    },
                                    callback
                                );
                            } else {
                                callback( null );
                            }
                        },

                        function createUser( callback ) {
                            var userData = {
                                AccountId:      account.id,
                                title:          data.title || null,
                                firstname:      data.firstname,
                                lastname:       data.lastname,
                                email:          data.email,
                                username:       data.username || data.email,
                                password:       data.password,
                                phone:          data.phone || null,
                                
                                // Implement user options!
                                active:         true,
                                confirmed:      config[ 'clever-auth' ].email_confirmation === true ? false : true,

                                // Is this actually needed?
                                hasAdminRight:  false
                            };

                            if ( RoleService !== null && role ) {
                                userData.RoleId =  role;
                            }

                            UserService
                                .create( userData, options )
                                .then( function( _user ) {
                                    user = _user;
                                    callback( null );
                                })
                                .catch( callback );
                        },

                        function authenticateUser( callback ) {
                            if ( config[ 'clever-auth' ].email_confirmation === true ) {
                                options.transaction.commit().then( function() {
                                    UserService
                                    .authenticate({
                                        email       : user.email,
                                        password    : user.password
                                    }, options )
                                    .then( function( _user ) {
                                        user = _user;
                                        callback( null );
                                    })
                                    .catch( callback );
                                });
                            } else {
                                options.transaction.commit().done( callback.bind( null, null ) ).catch( callback );
                            }
                        }
                    ],
                    function createComplete( err ) {
                        if ( err === null || typeof err === 'undefined' ) {
                            resolve( user );
                        } else {
                            options
                            .transaction
                            .rollback()
                            .done( function() {
                                reject( err );
                            })
                            .catch( function( additionalErr ) {
                                reject( additionalErr + ' was caused by ' + err );
                            });
                        }
                    }
                )
            });
        }
    });
}