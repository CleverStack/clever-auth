var crypto = require( 'crypto' )
  , moment = require( 'moment' );

module.exports = function( Service, UserModel, Exceptions, Promise, config ) {

    return Service.extend({

        /**
         * User model that will be used with this Service
         * @type {Model}
         */
        model: UserModel,

        /**
         * Makes sure when creating a user that there are no duplicate email addresses and formats/prepares the data
         * before passing the workload over to Service.create() by using this._super.apply( ... )
         * 
         * @param  {Object} data The users data
         * @return {Promise}
         */
        create: function( data ) {
            var service = this
              , create  = this._super;

            return new Promise( function( resolve, reject ) {
                UserModel
                    .find( { where: { email: data.email } } )
                    .then( function( user ) {

                        // Don't allow multiple users with the same email address
                        if ( user !== null ) {
                            return reject( new Exceptions.DuplicateModel( 'Email ' + data.email + ' already exists' ) );
                        }

                        // Prepare the data
                        data.username   = data.username || data.email;
                        data.active     = data.active !== undefined ? data.active : true;
                        data.password   = crypto.createHash( 'sha1' ).update( data.password ? data.password : Math.random().toString( 36 ).slice( -14 ) ).digest( 'hex' );
                        data.confirmed  = !config[ 'clever-auth' ].emailConfirmation ? true : false;

                        // Create the user
                        return create.apply( service, [ data ] );
                    })
                    .then( resolve )
                    .catch( reject );
            });
        },

        /**
         * Handles password changes before passing workload over to Service.update() to update a User
         * 
         * @param  {Mixed} idOrWhere Either an ID or an smart where object
         * @param  {Object} data     The data you wish to update
         * @return {Promise}
         */
        update: function( idOrWhere, data ) {
            if ( data.new_password ) {
                data.password = crypto.createHash( 'sha1' ).update( data.new_password ).digest( 'hex' );
                delete data.new_password;
            }

            return this._super( idOrWhere, data );
        },

        /**
         * This is used to check the credentials of a user who is trying to authenticate (signIn)
         * 
         * @param  {Object} credentials Object containing email and password
         * @return {Promise}
         */
        authenticate: function ( credentials ) {
            return new Promise( function( resolve, reject ) {

                // Make sure we have credentials to authenticate with
                if ( !credentials.email || !credentials.password ) {
                    return reject( new Exceptions.InvalidData( ( !credentials.email ? 'Email' : 'Password' ) ) + ' is required.' );
                }

                UserModel
                    .find({
                        where: {
                            email: credentials.email
                        }
                    })
                    .then( function( user ) {
                        // Ensure we have a valid user object
                        if ( !!user && !!user.id ) {

                            // Make sure the user is active
                            if ( !!user.active ) {

                                // Make sure the password matches
                                if ( user.password === credentials.password ) {
                                    user.accessedAt = Date.now();

                                    // Update the users last accessedAt field
                                    return user.save();
                                } else {
                                    reject( new Exceptions.InvalidLoginCredentials( 'Password is invalid.' ) );
                                }
                            } else {
                                reject( new Exceptions.UserNotActive( "Login is not active for " + user.email + '.' ) );
                            }
                        } else {
                            reject( new Exceptions.InvalidLoginCredentials( "Email address is invalid, User not found." ) );
                        }
                    })
                    .then( resolve )
                    .catch( reject );
            });
        },

        /**
         * Used to request a password recovery token/hash be emailed to a user allowing them to reset their password
         * 
         * @param  {String} email The email address of the user
         * @return {Promise}
         */
        recoverPassword: function( email ) {
            var service = this;

            return new Promise( function( resolve, reject ) {
                if ( !email ) {
                    return reject( new Exceptions.InvalidLoginCredentials( 'You must provide an email address.' ) );
                }

                UserModel
                    .find( { where: { email: email } } )
                    .then( function( user ) {
                        return service.generatePasswordResetHash( user );
                    })
                    .then( function( recoveryData ) {
                        return service.mailPasswordRecoveryDetails( recoveryData );
                    })
                    .then( resolve )
                    .catch( reject );
            });
        },

        /**
         * This is used to generate a unique and time limited token for a user to either confirm or reset/recover their password
         * 
         * @param  {UserModel} user The user we need to generate a hash for
         * @return {Promise}
         */
        generatePasswordResetHash: function( user ) {
            return new Promise( function( resolve, reject ) {
                if ( !user || !user.id ) {
                    return reject( new Exceptions.InvalidLoginCredentials( 'User doesn\'t exist.' ) );
                }

                var actionHref  = ( !user.confirmed ) ? 'user/confirm' : 'password_reset_submit'
                  , subject     = ( !user.confirmed ) ? 'User Confirmation' : 'Password Recovery'
                  , token       = user.createdAt + user.updatedAt + user.password + user.email + 'recoverPassword'
                  , hash        = crypto.createHash( 'md5' ).update( token, 'utf8' ).digest( 'hex' );

                resolve({
                    user:       user,
                    hash:       hash,
                    expiry:     moment.utc().add( 'hours', 8 ).valueOf(),
                    action:     actionHref,
                    subject:    subject
                });
            });
        },

        // @todo this needs allot of work to get it working as expected
        mailPasswordRecoveryDetails: function( data ) {
            var hostUrl = !!config[ 'clever-auth' ].hostUrl || 'localhost:' + config.webPort
              , link    =  hostUrl + '/' + data.action + '?u=' + data.user.id + '&t=' + data.hash + '&n=' + encodeURIComponent( data.user.fullName )
              , payload = {
                    to:     data.user.email,
                    text:   (obj.action === 'account_confirm') ? 
                        "Please click on the link below to activate your account\n " + link :
                        "Please click on the link below to enter a new password\n " + link
                }
              , info    = {
                    firstname:  data.user.firstname,
                    email:      data.user.email,
                    user:       data.user,
                    tplTitle:   'CleverStack: ' + data.subject
                };

            return new Promise( function( resolve, reject ) {
                reject( 'Mail not implemented yet' );

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
            });
        },

        sendConfirmationEmail: function( userId ) {
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
