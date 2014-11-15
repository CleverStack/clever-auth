var _ = require( 'underscore' );

module.exports = function ( Promise, Service, AccountModel, UserService, PermissionService, RoleService, sequelize, async, config, SiteService  ) {
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
                                    }
                                }, options )
                                .then( callback.bind( null, null ) )
                                .catch( callback );
                        },

                        function createDefaultRoles( defaultRoles, callback ) {
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
                                    confirmed:      false,

                                    // Is this actually needed?
                                    hasAdminRight:  false
                                }, options )
                                .then( function( _user ) {
                                    user = _user;
                                    callback( null );
                                })
                                .catch( callback );
                        },

                        function findDefaultSites( callback ) {
                            SiteService
                                .findAll({
                                    where: {
                                        AccountId:  null
                                    }
                                }, options )
                                .then( callback.bind( null, null ) )
                                .catch( callback );
                        },

                        function createDefaultSites( defaultSites, callback ) {
                            async.forEach(
                                defaultSites,
                                function createDefaultPermission( defaultSite, siteDone ) {
                                    var data        = JSON.parse( JSON.stringify( defaultSite ) )
                                      , preference  = data.Preferences;

                                    // Cleanup the Site data
                                    delete data.id;
                                    delete data.createdAt;
                                    delete data.updatedAt;
                                    delete data.deletedAt;
                                    delete data.charms;
                                    delete data.Preferences;
                                    data.AccountId = account.id;
                                    data.domainInclusions = account.subDomain + '*';

                                    // Cleanup the Sites Preference data
                                    delete preference.id;
                                    delete preference.SiteId;
                                    delete preference.createdAt;
                                    delete preference.updatedAt;
                                    delete preference.deletedAt;
                                    data.Preferences = preference;

                                    SiteService
                                        .create( data, options )
                                        .then( function() {
                                            siteDone( null );
                                        })
                                        .catch( siteDone );
                                },
                                callback
                            );
                        }//,

                        // function authenticateUser( callback ) {
                        //     options.transaction.commit().then( function() {
                        //         UserService
                        //         .authenticate({
                        //             email       : user.email,
                        //             password    : user.password
                        //         }, options )
                        //         .then( function( _user ) {
                        //             user = _user;
                        //             callback( null );
                        //         })
                        //         .catch( callback );
                        //     });
                        // }
                    ],
                    function createComplete( err ) {
                        if ( err === null || typeof err === 'undefined' ) {
                            options
                            .transaction
                            .commit()
                            .done( function() {
                                resolve( user );
                            })
                            .error( reject );
                        } else {
                            options
                            .transaction
                            .rollback()
                            .done( function() {
                                reject( err );
                            })
                            .error( function( additionalErr ) {
                                reject( additionalErr + ' was caused by ' + err );
                            });
                        }
                    }
                )
            });
        }
    });
}
