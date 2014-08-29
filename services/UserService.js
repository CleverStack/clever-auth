var crypto      = require( 'crypto' )
  , Promise     = require( 'bluebird' )
  , moment      = require( 'moment' )
  , config      = require( 'config' )
  , utils       = require( 'utils' )
  // , ejsRenderer = utils.ejsRenderer;

module.exports = function( Service, UserModel, Exceptions, RoleModel, PermissionModel ) {
    return Service.extend({
        model: UserModel,

        create: function( data, options ) {
            var create = this._super
              , that   = this;

            options = options || {};

            return new Promise( function( resolve, reject ) {
                UserModel
                    .find({
                        where: {
                            email: data.email
                        }
                    }, options )
                    .then( function( user ) {
                        if ( user !== null ) {
                            return reject( new Exceptions.DuplicateModel( 'Email ' + data.email + ' already exists' ) );
                        }

                        try {
                            EmailService = require( 'services' )[ 'EmailService' ];
                        } catch ( err ) {
                            console.error( err );
                        }

                        // Prepare the data
                        data.username = data.username || data.email;
                        data.active = data.active !== undefined ? data.active : true;
                        data.password = crypto.createHash( 'sha1' ).update( data.password ? data.password : Math.random().toString( 36 ).slice( -14 ) ).digest( 'hex' );

                        if ( EmailService === null || !config[ 'clever-auth' ].email_confirmation ) {

                            data.confirmed = true;

                            create.apply( that, [ data, options ] )
                                .then( resolve )
                                .catch( reject );

                        } else {

                            data.confirmed = false;

                            create.apply( that, [ data, options ] )
                                .then( function( user ) {
                                    return service.generatePasswordResetHash( user );
                                })
                                .then( service.mailPasswordRecoveryToken )
                                .then( resolve )
                                .catch( reject );
                        }
                    })
                    .catch( reject );

            });
        },

        update: function( idOrWhere, data, options ) {
            if ( data.new_password ) {
                data.password = crypto.createHash( 'sha1' ).update( data.new_password ).digest( 'hex' );
                delete data.new_password;
            }

            return this._super.apply( this, [ idOrWhere, data, options ] );
        },

        //tested
        authenticate: function ( credentials, options ) {
            options = options || {};

            return new Promise( function( resolve, reject ) {
                UserModel
                    .find({
                        where: {
                            email:      credentials.email,
                            password:   credentials.password
                        }
                    }, options )
                    .then( function( user ) {
                        if ( !!user && !!user.id ) {
                            if ( !!user.active ) {
                                user.accessedAt = Date.now();
                                return user.save( options );
                            } else {
                                reject( new Exceptions.UserNotActive( "Login is not active for " + user.email + '.' ) );
                            }
                        } else {
                            reject( new Exceptions.InvalidLoginCredentials( "Invalid login credentials." ) );
                        }
                    })
                    .then( function( user ) {
                        RoleModel
                            .find({
                                where: {
                                    id: user.RoleId
                                },
                                include: [
                                    PermissionModel
                                ]
                            }, options )
                            .then( function( role ) {
                                user._model.values.role = role;
                                resolve( user );
                            })
                            .catch( reject );
                    })
                    .catch( reject );
            });
        },

        //tested
        generatePasswordResetHash: function ( user ) {
            return new Promise( function( resolve ) {
                var md5 = null
                  , hash = null
                  , expTime = null
                  , actionpath = ( !user.confirmed ) ? 'user/confirm' : 'password_reset_submit'
                  , mailsubject = ( !user.confirmed ) ? 'User Confirmation' : 'Password Recovery';


                md5 = crypto.createHash( 'md5' );
                md5.update( user.createdAt + user.updatedAt + user.password + user.email + 'recover', 'utf8' );
                hash = md5.digest( 'hex' );
                expTime = moment.utc().add( 'hours', 8 ).valueOf();

                resolve({
                    hash: hash,
                    expTime: expTime,
                    user: user,
                    action: actionpath,
                    mailsubject: mailsubject,
                    tplData: tplData || null
                });
            });
        },

        // @todo this needs allot of work to get it working as expected
        mailPasswordRecoveryToken: function ( recoveryData ) {
            var url     = [ config['clever-auth'].hostUrl, config.webPort ].join('')
              , link    = url + '/' + recoveryData.action + '?u=' + recoveryData.user.id + '&t=' + recoveryData.hash + '&n=' + encodeURIComponent( recoveryData.user.fullName )
              , payload = { to: recoveryData.user.email }

            payload.text = ( payload.action === 'account_confirm' ) ? "Please click on the link below to activate your account\n " + link : "Please click on the link below to enter a new password\n " + link;

            var templateData = {
                link: link,
                companyLogo: 'http://app.CleverTech.biz/images/logo.png',
                companyName: 'CleverStack'
            };

            var tplName = ( recoveryData.action === 'account_confirm' ) ? 'newUser.ejs' : 'passwordRecovery.ejs';

            if ( !recoveryData.tplData ) {
                payload.subject     = 'CleverStack: ' + recoveryData.mailsubject;

                templateData.firstname      = recoveryData.user.firstname;
                templateData.email          = recoveryData.user.email;
                templateData.user           = recoveryData.user;
                templateData.tplTitle       = 'CleverStack: Password Recovery';

            } else {
                payload.subject     = recoveryData.tplData.subject;

                templateData.tplTitle       = recoveryData.tplData.tplTitle;
                templateData.firstName      = recoveryData.tplData.firstName;
                templateData.userFirstName  = recoveryData.tplData.userFirstName;
                templateData.userEmail      = recoveryData.tplData.userEmail;
            }

            return new Promise( function( resolve, reject ) {
                ejsRenderer( 'modules/clever-auth/templates/email/' + tplName, templateData )
                    .then( function( html ) {
                        payload.html = html;
                        return mailer( payload );
                    })
                    .then( resolve )
                    .catch( reject );
            });
        },

        resendAccountConfirmation: function( userId, tplData ) {
            var service = this;
            
            return new Promise( function( resolve, reject ) {
                UserModel
                    .find( userId )
                    .success( function ( user ) {

                        if ( !user ) {
                            resolve( { statuscode: 403, message: "User doesn't exist" } );
                            return;
                        }

                        if ( user.confirmed ) {
                            resolve( { statuscode: 400, message: user.email + ' , has already confirmed the account' } );
                            return;
                        }

                        tplData.userFirstName = user.firstname;
                        tplData.userEmail = user.email;

                        service.generatePasswordResetHash( user, tplData )
                            .then( service.mailPasswordRecoveryToken )
                            .then( function () {
                                resolve( { statuscode: 200, message: 'A confirmation link has been resent' } );
                            })
                            .catch( reject );

                    })
                    .catch( resolve );
            });

        }

    });
};
