var crypto      = require( 'crypto' )
  , Promise     = require( 'bluebird' )
  , moment      = require( 'moment' )
  , config      = require( 'config' )
  , utils       = require( 'utils' )
  , ejsRenderer = utils.ejsRenderer
  , mailer      = utils.mailer;

module.exports = function( Service, UserModel, Exceptions ) {
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

                        // Prepare the data
                        data.username = data.username || data.email;
                        data.active = data.active !== undefined ? data.active : true;
                        data.password = crypto.createHash( 'sha1' ).update( data.password ? data.password : Math.random().toString( 36 ).slice( -14 ) ).digest( 'hex' );

                        if ( data.confirmed === undefined || data.confirmed === false ) {
                            data.confirmed = false;

                            var tplData = {
                                action          : 'account_confirm',
                                tplTitle        : 'Email Confirmation'
                            };

                            var unconfirmedUser;

                            create
                            .apply( that, [ data, options ] )
                            .then( function( usr ) {
                                unconfirmedUser = usr;
                                return that.generatePasswordResetHash( usr, tplData );
                            })
                            .then( that.mailPasswordRecoveryToken )
                            .then( function() {
                                resolve( unconfirmedUser );
                            })
                            .catch( reject );
                            
                        } else {
                            create.apply( that, [ data, options ] )
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
                            if ( !!user.confirmed && !!user.active ) {
                                user.accessedAt = Date.now();
                                return user.save( options );
                            } else {
                                reject( new Exceptions.UserNotActive( "Login is not active for " + user.email + '.' ) );
                            }
                        } else {
                            reject( new Exceptions.InvalidLoginCredentials( "Invalid login credentials." ) );
                        }
                    })
                    .then( resolve )
                    .catch( reject );
            });
        },

        generatePasswordResetHash: function ( user, tplData ) {
            return new Promise( function( resolve ) {
                var md5 = crypto.createHash( 'md5' ).update( user.createdAt + user.updatedAt + user.password + user.email + 'recover', 'utf8' );

                resolve({
                    hash        : md5.digest( 'hex' ),
                    expTime     : moment.utc().add( 'hours', 8 ).valueOf(),
                    tpl         : !user.confirmed ? 'newUser.ejs' : 'passwordRecovery.ejs',
                    action      : !user.confirmed ? 'account/confirm' : 'resetPassword',
                    subject     : !user.confirmed ? 'User Confirmation' : 'Password Recovery',
                    user        : user,

                    tplData     : tplData || {}
                });
            });
        },

        mailPasswordRecoveryToken: function ( recoveryData ) {
            var url             = config['clever-auth'].appUrl
              , link            = url + '/' + recoveryData.action + '?u=' + recoveryData.user.id + '&t=' + recoveryData.hash + '&n=' + encodeURIComponent( recoveryData.user.fullName )
              , payload         = { to: recoveryData.user.email }

            payload.to          = recoveryData.user.email;
            payload.from        = 'no-reply@cleverstack.com';
            payload.fromname    = 'CleverStack' + '-' + ( process.env.NODE_ENV || 'LOCAL' );
            payload.text        = ( recoveryData.tplData.action === 'account/confirm' ) ? "Please click on the link below to activate your account\n " + link : "Please click on the link below to enter a new password\n " + link;
            payload.subject     = recoveryData.subject;

            var templateData = {
                link            : link,
                companyLogo     : 'http://dev.cleverstack.com/images/logobig.png',
                companyName     : 'CleverStack',
                subject         : recoveryData.subject,
                tplTitle        : recoveryData.tplData.tplTitle || 'Password Recovery'
            };

            templateData.firstname      = recoveryData.user.firstname;
            templateData.email          = recoveryData.user.email;
            templateData.user           = recoveryData.user;

            return new Promise( function( resolve, reject ) {
                ejsRenderer( 'modules/clever-auth/templates/email/' + recoveryData.tpl, templateData )
                    .then( function( html ) {
                        payload.html = html;
                        return mailer.send( payload );
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
