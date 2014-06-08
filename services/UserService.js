var crypto      = require( 'crypto' )
  , Promise     = require( 'bluebird' )
  , moment      = require( 'moment' )
  , injector    = require( 'injector' )
  , config      = require( 'config' )
  , debug       = require( 'debug' )( 'cleverAuth' );

module.exports = function ( Service, UserModel ) {
    var EmailService = null;

    return Service.extend({
        model: UserModel,

        //tested
        authenticate: function ( credentials ) {
            return new Promise( function( resolve, reject ) {
                UserModel
                    .find( credentials )
                    .then( function( user ) {
                        if ( !!user && !!user.id ) {
                            if ( !!user.active ) {
                                user.accessedAt = Date.now();
                                user.save()
                                    .then( resolve )
                                    .catch( reject );
                            } else {
                                resolve( { statuscode: 403, message: "Login is not active for " + user.email + '.' }  );
                            }
                        } else {
                            resolve( { statuscode: 403, message: "User doesn't exist." }  );
                        }
                    })
                    .catch( reject );
            });
        },

        //tested
        generatePasswordResetHash: function ( user, tplData ) {
            return new Promise( function( resolve, reject ) {
                var md5 = null
                  , hash = null
                  , expTime = null
                  , actionpath = ( !user.confirmed ) ? 'user/confirm' : 'password_reset_submit'
                  , mailsubject = ( !user.confirmed ) ? 'User Confirmation' : 'Password Recovery';

                if ( !user || !user.createdAt || !user.updatedAt || !user.password || !user.email ) {
                    resolve( { statuscode: 403, message: 'Unauthorized' } );
                } else {
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
                }
            });
        },

        // @todo this needs allot of work to get it working as expected
        mailPasswordRecoveryToken: function ( obj ) {

//            var hosturl = !!config.hosturl
//                ? config.hosturl
//                : [ config['clever-auth'].hostUrl, config.webPort ].join('');
//
//            var link = hosturl + '/' + obj.action + '?u=' + obj.user.id + '&t=' + obj.hash + '&n=' + encodeURIComponent( obj.user.fullName );


            // var payload = { to: obj.user.email, from: 'no-reply@CleverTech.biz' };

            // payload.text = (obj.action === 'account_confirm')
            //     ? "Please click on the link below to activate your account\n " + link
            //     : "Please click on the link below to enter a new password\n " + link;

            // var info = { link: link, companyLogo: 'http://app.CleverTech.biz/images/logo.png', companyName: 'CleverTech' };

            // info.tplName = (obj.action === 'account_confirm')
            //     ? 'userNew'
            //     : 'passwordRecovery';

            // if ( !obj.tplData ) {
            //     payload.subject = 'CleverTech: ' + obj.mailsubject;

            //     info.firstname = obj.user.firstname;
            //     info.username = obj.user.username;
            //     info.user = obj.user;
            //     info.tplTitle = 'CleverTech: Password Recovery';

            // } else {
            //     payload.subject = obj.tplData.subject;

            //     info.tplTitle = obj.tplData.tplTitle;
            //     info.firstName = obj.tplData.firstName;
            //     info.accountSubdomain = obj.tplData.accountSubdomain;
            //     info.userFirstName = obj.tplData.userFirstName;
            //     info.userEmail = obj.tplData.userEmail;
            // }

            return Q.resolve( 'Init Promise Chaining' )
                .then( function () {
                    return { statuscode: 200, message: 'Message successfully sent' };
                } )
                // .then( function() {
                //     return bakeTemplate( info );
                // } )
                // .then( function ( html ) {
                //     payload.html = html;

                //     return mailer( payload );
                // } )
                // .then( function () {
                //     return { statuscode: 200, message: 'Message successfully sent' };
                // } )
                .fail( function ( err ) {
                    console.log( "\n\nERRR: ", err );
                    return { statuscode: 500, message: err };
                } );
        },

        //tested
        create: function( data, tplData ) {
            var _super = this._super
              , that   = this;

            return new Promise( function( resolve, reject ) {
                UserModel
                    .find( { email: data.email } )
                    .then( function( user ) {
                        if ( user !== null ) {
                            return resolve( { statuscode: 400, message: 'Email already exist' } );
                        }

                        try {
                            EmailService = require( 'services' )[ 'EmailService' ];
                        } catch ( err ) {
                            console.error( err );
                        }

                        // Prepare the data
                        data.username = data.username || data.email;
                        data.active = true;
                        data.password = data.password
                            ? crypto.createHash( 'sha1' ).update( data.password ).digest( 'hex' )
                            : Math.random().toString( 36 ).slice( -14 );

                        if ( EmailService === null || !config[ 'clever-auth' ].email_confirmation ) {

                            data.confirmed = true;

                            _super.apply( that, [ data ] )
                                .then( resolve )
                                .catch( reject );

                        } else {

                            data.confirmed = false;

                            _super.apply( that, [ data ] )
                                .then( function( user ) {
                                    return service.generatePasswordResetHash( user, tplData );
                                })
                                .then( service.mailPasswordRecoveryToken )
                                .then( resolve )
                                .catch( reject );
                        }
                    })
                    .catch( reject );

            });
        },

        resendAccountConfirmation: function ( userId, tplData ) {
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

        },

        update: function ( userId, data ) {
            if ( data.new_password ) {
                data.password = crypto.createHash( 'sha1' ).update( data.new_password ).digest( 'hex' );
                delete data.new_password;
            }

            return this._super( userId, data );
        } //tested

    });
};