var Q = require( 'q' )
  , crypto = require( 'crypto' )
  , moment = require( 'moment' )
  , config = require( 'config' )
  , moduleLoader = injector.getInstance( 'moduleLoader' )
  , Promise = require( 'bluebird' )
  , BaseService = require( 'services' ).BaseService
  , EmailService = null
  , UserService = null
  , UserModel = null
  , db = null;

module.exports = function ( UserModel ) {
    if ( UserService && UserService.instance ) {
        return UserService.instance;
    }

    UserService = BaseService.extend( {

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
                                    .then( function( user ) {
                                        resolve( JSON.parse( JSON.stringify( user ) ) );
                                    })
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
        getUserFullDataJson: function ( id ) {
            return new Promise( function( resolve, reject ) {
                UserModel
                    .find( id )
                    .then( function( user ) {
                        if ( !!user && !!user.id ) {
                            resolve( JSON.parse( JSON.stringify( user ) ) );
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
        createUser: function ( data, tplData ) {
            var service = this
              , usr;

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

                        if ( EmailService === null || !config[ 'clever-auth' ].email_confirmation ) {

                            data.confirmed = true;

                            service
                                .saveNewUser( data )
                                .then( resolve )
                                .catch( reject );

                        } else {

                            data.confirmed = false;

                            service
                                .saveNewUser( data )
                                .then( function( user ) {
                                    usr = user;
                                    return service.generatePasswordResetHash( user, tplData );
                                })
                                .then( service.mailPasswordRecoveryToken )
                                .then( function() {
                                    resolve( usr );
                                } )
                                .catch( reject );
                        }
                    })
                    .catch( reject );

            });
        }, 

        //tested
        saveNewUser: function ( data ) {
            return new Promise( function( resolve, reject ) {
                data.username = data.username || data.email;
                data.active = true;
                data.password = data.password
                    ? crypto.createHash( 'sha1' ).update( data.password ).digest( 'hex' )
                    : Math.random().toString( 36 ).slice( -14 );

                UserModel
                    .create( data )
                    .then( resolve )
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
                            resolve( { statuscode: 403, message: user.email + ' , has already confirmed the account' } );
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

        handleUpdateUser: function ( userId, data ) {
            var deferred = Q.defer();

            UserModel
                .find( { where: { id: userId } } )
                .success( function ( user ) {

                    if ( !user ) {
                        deferred.resolve( { statuscode: 403, message: 'invalid id' } );
                        return;
                    }

                    if ( data.password && data.new_password ) {

                        if ( crypto.createHash( 'sha1' ).update( data.password ).digest( 'hex' ) !== user.password ) {
                            deferred.resolve( {statuscode: 403, message: 'Invalid password'} );
                            return;
                        }

                        data.hashedPassword = crypto.createHash( 'sha1' ).update( data.new_password ).digest( 'hex' );
                    }

                    this
                        .checkEmailAndUpdate( user, data )
                        .then( deferred.resolve )
                        .fail( deferred.reject );

                }.bind( this ) )
                .error( deferred.reject );

            return deferred.promise;
        }, //tested

        checkEmailAndUpdate: function ( user, data ) {
            var deferred = Q.defer();

            if ( data.email && ( user.email != data.email ) ) {

                UserModel
                    .find( { where: { email: data.email } } )
                    .success( function ( chkUser ) {

                        if ( chkUser ) {
                            deferred.resolve( { statuscode: 400, message: "email already exists" } );
                            return;
                        }

                        this
                            .updateUser( user, data )
                            .then( deferred.resolve )
                            .fail( deferred.reject );

                    }.bind( this ) )
                    .error( deferred.reject );
            } else {

                this
                    .updateUser( user, data )
                    .then( deferred.resolve )
                    .fail( deferred.reject );
            }

            return deferred.promise;
        }, //tested

        updateUser: function ( user, data ) {
            var deferred = Q.defer();

            user.firstname = data.firstname || user.firstname;
            user.lastname = data.lastname || user.lastname;
            user.email = data.email || user.email;
            user.phone = data.phone || user.phone;

            if ( data.hashedPassword ) {
                user.password = data.hashedPassword;
            }

            user.save()
                .success( function ( user ) {

                    this
                        .getUserFullDataJson( { id: user.id } )
                        .then( deferred.resolve )
                        .fail( deferred.reject );

                }.bind( this ) )
                .error( deferred.reject );

            return deferred.promise;
        }, //tested

        listUsers: function() {
            return new Promise( function( resolve, reject ) {
                UserModel
                    .findAll()
                    .then( function( users ) {
                        resolve( !users && !users.length 
                            ? false
                            : users.map( function( u ) { return u.toJSON(); } )
                        );
                    })
                    .catch( reject );
            });
        }, //tested

        deleteUser: function( userId ) {
            var deferred = Q.defer();

            UserModel
                .find( userId )
                .success( function( user ) {

                    if ( !!user && !!user.id ) {

                        user
                            .destroy()
                            .success( function( result ) {

                                if ( !result.deletedAt ) {
                                    deferred.resolve( { statuscode: 500, message: 'error' } );
                                } else {
                                    deferred.resolve( { statuscode: 200, message: 'user is deleted' } );
                                }

                            })
                            .error( deferred.reject );

                    } else {
                        deferred.resolve( { statuscode: 403, message: 'user do not exist' } )
                    }
                })
                .error( deferred.reject );

            return deferred.promise;
        }

    } );

    UserService.instance = new UserService( UserModel._db );
    UserService.Model = UserModel;

    return UserService.instance;
};