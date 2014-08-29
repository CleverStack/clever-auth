var _ = require( 'underscore' );

module.exports = function ( Promise, Service, sequelize, async, config, AccountModel, UserService, PermissionService, RoleService ) {
    return Service.extend({

        model: AccountModel,

        create: function( data, options ) {
            var create  = this._super
              , service = this
              , account = null
              , permissions = []
              , role    = null
              , user    = null;

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
                                active:     !config[ 'clever-roles' ].account.requireConfirmation ? true : false
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
                            PermissionService
                                .findAll({
                                    where: {
                                        AccountId: null,
                                        systemPermission: true
                                    }
                                }, options)
                                .then( callback.bind( null, null ) )
                                .catch( callback );
                        },

                        function createDefaultPermissions( defaultPermissions, callback ) {
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
                        },

                        function findDefaultRoles( callback ) {
                            RoleService
                                .findAll({
                                    where: {
                                        AccountId:  null,
                                        systemRole: true
                                    },
                                    include: [
                                        PermissionService.model
                                    ]
                                }, options )
                                .then( callback.bind( null, null ) )
                                .catch( callback );
                        },

                        function createDefaultRoles( defaultRoles, callback ) {
                            async.forEach(
                                defaultRoles,
                                function createDefaultRole( defaultRole, done ) {
                                    var rolePermissions = [];

                                    if ( defaultRole.permissions ) {
                                        defaultRole.permissions.forEach( function( rolePermission ) {
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
                                            permissions:    rolePermissions
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
                        },

                        function createUser( callback ) {
                            UserService
                                .create(
                                {
                                    AccountId:      account.id,
                                    RoleId:         role.id,
                                    title:          data.title || null,
                                    firstname:      data.firstname,
                                    lastname:       data.lastname,
                                    email:          data.email,
                                    username:       data.username || data.email,
                                    password:       data.password,
                                    phone:          data.phone || null,
                                    
                                    // Implement user options!
                                    active:         true,
                                    confirmed:      true,

                                    // Is this actually needed?
                                    hasAdminRight:  false
                                }, options )
                                .then( function( _user ) {
                                    return UserService.authenticate({
                                        email: _user.email,
                                        password: _user.password
                                    }, options );
                                })
                                .then( function( _user ) {
                                    user = _user;
                                    callback( null );
                                })
                                .catch( callback );
                        }
                    ],
                    function createComplete( err ) {
                        if ( err === null || typeof err === 'undefined' ) {
                            if ( options.transaction ) {
                                options.transaction.commit();
                            }
                            resolve( user );
                        } else {
                            if ( options.transaction ) {
                                options.transaction.rollback();
                            }
                            reject( err );
                        }
                    }
                )
            });
        }
    });
}
