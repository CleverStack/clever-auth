var expect      = require( 'chai' ).expect
  , utils       = require( 'utils' )
  , injector    = require( 'injector' )
  , exceptions  = require( 'exceptions' )
  , sinon       = require( 'sinon' )
  , env         = utils.bootstrapEnv()
  , Service     = injector.getInstance( 'Service' )
  , Model       = injector.getInstance( 'Model' )
  , UserModel
  , UserService;

describe( 'CleverAuth.Service.UserService', function () {

    before( function( done ) {
        UserService = injector.getInstance( 'cleverAuth' ).services.UserService;
        UserModel   = injector.getInstance( 'cleverAuth' ).models.UserModel;

        done();
    });

    it( 'should have loaded the test service', function( done ) {
        expect( UserService instanceof Service.Class ).to.eql( true );
        expect( UserService.on ).to.be.a( 'function' );
        expect( UserService.find ).to.be.a( 'function' );
        expect( UserService.findAll ).to.be.a( 'function' );
        expect( UserService.create ).to.be.a( 'function' );
        expect( UserService.update ).to.be.a( 'function' );
        expect( UserService.destroy ).to.be.a( 'function' );
        expect( UserService.query ).to.be.a( 'function' );
        expect( UserService.model ).to.equal( UserModel );

        done();
    });

    describe( '.authenticate( credentials )', function () {

        var joesData = {
            username:   'Joe',
            email:      'joe@cleverAuth.com',
            password:   '1234'
        };
        var rachelsData = {
            username:   'Rachel',
            email:      'rachel@cleverAuth.com',
            password:   '1234'
        };

        it( 'should return a User with specified credentials', function( done ) {
            UserService
                .create( joesData )
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( joesData.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( joesData.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( joesData.password );

                    return UserService.create( rachelsData )
                })
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( rachelsData.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( rachelsData.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( rachelsData.password );

                    rachelsData.updatedAt = model.updatedAt;

                    return UserService.authenticate({
                        email:      rachelsData.email,
                        password:   rachelsData.password
                    });
                })
                .then( function( model ) {
                    expect( model instanceof UserModel ).to.eql( true );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( rachelsData.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( rachelsData.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( rachelsData.password );

                    // Make sure it updates the accessedAt field after a successful login
                    expect( model ).to.have.property( 'accessedAt' ).and.to.not.eql( rachelsData.accessedAt );

                    done();
                })
                .catch( done );
        });

        it( 'should return an error when the user is inactive', function( done ) {
            var data = {
                username:   'joeInactive@example.com',
                email:      'joeInactive@example.com',
                password:   '1234',
                active:     false
            };

            UserService
                .create( data )
                .then( function() {
                    return UserService.authenticate({
                        email:      data.email,
                        password:   data.password
                    });
                })
                .then( function( user ) {
                    expect( user ).to.eql( undefined );
                })
                .catch( function( err ) {
                    expect( err instanceof exceptions.UserNotActive ).to.eql( true );
                    expect( err ).to.have.property( 'message' ).and.to.eql( 'Login is not active for joeInactive@example.com.' );
                    expect( err ).to.have.property( 'statusCode' ).and.to.eql( 403 );

                    done();
                });
        });
    });

    describe( '.create( data )', function () {

        it( 'cannot create duplicate users with the same email', function( done ) {

            var data = {
                username:   'noduplicates@example.com',
                email:      'noduplicates@example.com',
                password:   '1234'
            };

            UserService
                .create( data )
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( data.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( data.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( data.password );

                    return UserService.create( data );
                })
                .then( function( user ) {
                    expect( user ).to.eql( undefined );
                })
                .catch( function( err ) {
                    expect( err instanceof exceptions.DuplicateModel ).to.eql( true );
                    expect( err ).to.have.property( 'message' ).and.to.eql( 'Email ' + data.email + ' already exists' );

                    done();
                });
        });

        it( 'should create a user', function( done ) {

            var data = {
                username:   'newUser@cleverAuth.com',
                email:      'newUser@cleverAuth.com',
                password:   '1234'
            };

            UserService
                .create( data )
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( data.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( data.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( data.password );

                    done();
                })
                .catch( done );
        });

        it( 'should auto generate random password when password is not given', function( done ) {

            var data = {
                username:   'autoGeneratePassword@cleverAuth.com',
                email:      'autoGeneratePassword@cleverAuth.com'
            };

            UserService
                .create( data )
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( data.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( data.email );
                    expect( model ).to.have.property( 'password' ).and.to.not.equal( undefined );

                    done();
                })
                .catch( done );
        });

        it.skip( 'should call .generatePasswordResetHash method if EmailService exist and do not call otherwise', function ( done ) {
            sinon.spy( UserService, "generatePasswordResetHash" );

            var data = {
                username: 'Rachel21',
                email: 'rachel21@example.com',
                password: '1234'
            };

            UserService
                .createUser( data )
                .then( function () {

                    if ( EmailService !== null && config['clever-auth'].email_confirmation ) {

                        expect( UserService.generatePasswordResetHash.calledOnce ).to.be.true;

                        UserService
                            .generatePasswordResetHash
                            .restore();
                    } else {

                        expect( UserService.generatePasswordResetHash.calledOnce ).to.be.false;

                    }
                    done();
                } )
                .fail( done );
        });

        it.skip( 'should call .mailPasswordRecoveryToken method if EmailService exist and do not call otherwise', function ( done ) {
            this.timeout( 5000 );
            sinon.spy( UserService, "mailPasswordRecoveryToken" );

            var data = {
                username: 'Rachel22',
                email: 'rachel22@example.com',
                password: '1234'
            };

            UserService
                .createUser( data )
                .then( function () {

                    if ( EmailService !== null && config['clever-auth'].email_confirmation ) {

                        expect( UserService.mailPasswordRecoveryToken.calledOnce ).to.be.true;

                        UserService
                            .mailPasswordRecoveryToken
                            .restore();
                    } else {

                        expect( UserService.mailPasswordRecoveryToken.calledOnce ).to.be.false;

                    }
                    done();
                } )
                .fail( done );
        }); 
    });

    describe( '.update( idOrWhere, data )', function () {

        it( 'hash password when new password is given', function ( done ) {

            var data = {
                username:   'hashPassword@cleverAuth.com',
                email:      'hashPassword@cleverAuth.com',
                password:   '1234'
            };
            var originalPassword = null;

            UserService
                .create( data )
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( data.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( data.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( data.password );

                    originalPassword = data.password;

                    data.password = 'hashedPassword';

                    return UserService.update( model.id, data );
                })
                .then( function( model ) {
                    expect( model instanceof Model ).to.eql( true );
                    expect( model ).to.be.an( 'object' );
                    expect( model ).to.have.property( 'id' );
                    expect( model ).to.have.property( 'username' ).and.to.eql( data.username );
                    expect( model ).to.have.property( 'email' ).and.to.eql( data.email );
                    expect( model ).to.have.property( 'password' ).and.to.eql( data.password ).and.to.not.eql( originalPassword );

                    done();
                })
                .catch( done );
        });
    });

    describe.skip( '.generatePasswordResetHash( user )', function () {

        it.skip( 'should return data for user confirmation', function ( done ) {

            var data = {
                username: 'Rachel12',
                email: 'rachel12@example.com',
                password: '1234',
                confirmed: false
            };

            UserService
                .create( data )
                .then( function ( user ) {

                    expect( user ).to.be.an( 'object' ).and.be.ok;

                    //Properties needed for creating hash value
                    expect( user ).to.have.property( 'createdAt' ).and.be.ok;
                    expect( user ).to.have.property( 'updatedAt' ).and.be.ok;
                    expect( user ).to.have.property( 'password' ).and.be.ok;
                    expect( user ).to.have.property( 'email' ).and.equal( data.email );
                    expect( user ).to.have.property( 'confirmed' ).and.equal( data.confirmed );

                    return UserService.generatePasswordResetHash( user );
                } )
                .then( function ( recoverydata ) {

                    expect( recoverydata ).to.be.an( 'object' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'hash' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'expTime' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'user' ).and.be.ok;
                    expect( recoverydata.user ).to.be.an( 'object' ).and.be.ok;
                    expect( recoverydata.user ).to.have.property( 'id' ).and.be.ok;
                    expect( recoverydata.user ).to.have.property( 'fullName' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'action' ).and.be.ok;
                    expect( recoverydata.action ).to.be.an( 'string' ).and.include( 'confirm' );
                    expect( recoverydata ).to.have.property( 'mailsubject' ).and.be.ok;
                    expect( recoverydata.mailsubject ).to.be.an( 'string' ).and.include( 'Confirmation' );

                    done();
                } )
                .fail( done );
        });

        it.skip( 'should return data for password recovery', function ( done ) {

            var data = {
                username: 'Rachel13',
                email: 'rachel13@example.com',
                password: '1234',
                confirmed: true,
                "AccountId": 1
            };

            UserService
                .create( data )
                .then( function ( user ) {

                    expect( user ).to.be.an( 'object' ).and.be.ok;

                    //Properties needed for creating hash value
                    expect( user ).to.have.property( 'createdAt' ).and.be.ok;
                    expect( user ).to.have.property( 'updatedAt' ).and.be.ok;
                    expect( user ).to.have.property( 'password' ).and.be.ok;
                    expect( user ).to.have.property( 'email' ).and.equal( data.email );
                    expect( user ).to.have.property( 'confirmed' ).and.equal( data.confirmed );

                    return UserService.generatePasswordResetHash( user );
                } )
                .then( function ( recoverydata ) {

                    expect( recoverydata ).to.be.an( 'object' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'hash' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'expTime' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'user' ).and.be.ok;
                    expect( recoverydata.user ).to.be.an( 'object' ).and.be.ok;
                    expect( recoverydata.user ).to.have.property( 'id' ).and.be.ok;
                    expect( recoverydata.user ).to.have.property( 'fullName' ).and.be.ok;
                    expect( recoverydata ).to.have.property( 'action' ).and.be.ok;
                    expect( recoverydata.action ).to.be.an( 'string' ).and.include( 'reset' );
                    expect( recoverydata ).to.have.property( 'mailsubject' ).and.be.ok;
                    expect( recoverydata.mailsubject ).to.be.an( 'string' ).and.include( 'Recovery' );

                    done();
                } )
                .fail( done );
        });

        it.skip( 'should return status 403 and message when user missing fields', function ( done ) {
            var data = {
                username: 'Rachel13',
                email: 'rachel13@example.com',
                password: '1234'
            };

            UserService
                .generatePasswordResetHash( data )
                .then( function ( result ) {

                    expect( result ).to.be.an( 'object' ).and.be.ok;
                    expect( result ).to.have.property( 'statuscode' ).and.equal( 403 );
                    expect( result ).to.have.property( 'message' ).and.be.an( 'string' ).and.be.ok;

                    done();
                } )
                .fail( done );
        });
    });

    describe.skip( '.mailPasswordRecoveryToken( obj )', function () {

        it( 'should return status 200 and a message for account confirmation action ', function ( done ) {
            var data =
                {
                    user: {
                        email: "email@mail.com",
                        id: "id",
                        fullName: "Jim Ioak"
                    },
                    hash: "some_valid_hash",
                    mailsubject: "some_valid_subject",
                    action: "account_confirm"
                };

            UserService
                .mailPasswordRecoveryToken( data )
                .then( function ( result ) {

                    should.exist( result );
                    result.should.be.a( 'object' );

                    result.should.have.property( 'statuscode', 200 );
                    result.should.have.property( 'message' );
                    done();
                } )
                .fail( done );
        });

        it.skip( 'should return status 200 and a message for password recovery action ', function ( done ) {
            var data = {
                user: { email: "email@mail.com", id: "id", fullName: "Jim Ioak" }, hash: "some_valid_hash", mailsubject: "some_valid_subject", action: "password_reset_submit"
            };

            UserService
                .mailPasswordRecoveryToken( data )
                .then( function ( result ) {

                    should.exist( result );
                    result.should.be.a( 'object' );

                    result.should.have.property( 'statuscode', 200 );
                    result.should.have.property( 'message' );
                    done();
                })
                .fail( done );
        });

        it.skip( 'should return status 500 and a message for unrecognized action ', function ( done ) {
            var data = {
                user: { email: "email@mail.com", id: "id", fullName: "Jim Ioak" }, hash: "some_valid_hash", mailsubject: "some_valid_subject", action: "unrecognized_action"
            };

            UserService
                .mailPasswordRecoveryToken( data )
                .then( function ( result ) {
                    should.exist( result );
                    result.should.be.a( 'object' );

                    result.should.have.property( 'statuscode', 500 );
                    result.should.have.property( 'message' );

                    done();
                } )
                .fail( done );
        });
    });

    describe.skip( '.resendAccountConfirmation( me, userId )', function () {
        it.skip( 'should return status code 403 and message when user id does not exist', function( done ) {
            var userId = 'noneExistedId'
              , accId = 1;

            UserService
                .resendAccountConfirmation( accId, userId )
                .then( function( data ) {
                    should.exist( data );

                    data.should.be.a( 'object' );
                    data.should.have.property( 'statuscode', 403 );
                    data.should.have.property( 'message' ).and.not.be.empty;
                    done();
                })
        });

        it.skip( 'should return status code 403 and message when account ids do not match', function ( done ) {
            var newuser = {
                    username: 'rachel35@example.com',
                    email: 'rachel35@example.com',
                    password: '123',
                    "AccountId": 1
                }
                , accId = 2;


            UserService
                .create( newuser )
                .then( function ( user ) {
                    return UserService.resendAccountConfirmation( accId, user );
                } )
                .then( function ( data ) {
                    should.exist( data );

                    data.should.be.a( 'object' );
                    data.should.have.property( 'statuscode', 403 );
                    data.should.have.property( 'message' ).and.not.be.empty;
                    done();
                } )
                .fail( done );
        });

        it.skip( 'should return status code 403 and message when account has been confirmed', function ( done ) {
            var newuser = {
                    username: 'rachel36@example.com',
                    email: 'rachel36@example.com',
                    password: '123',
                    confirmed: true,
                    "AccountId": 1
                }
                , accId = 1;


            UserService
                .create( newuser )
                .then( function ( user ) {
                    return UserService.resendAccountConfirmation( accId, user );
                } )
                .then( function ( data ) {
                    should.exist( data );

                    data.should.be.a( 'object' );
                    data.should.have.property( 'statuscode', 403 );
                    data.should.have.property( 'message' ).and.not.be.empty;
                    done();
                } )
                .fail( done );
        });

        it.skip( 'should call .generatePasswordResetHash method ', function ( done ) {
            sinon.spy( UserService, "generatePasswordResetHash" );

            var newuser = {
                    username: 'rachel363@example.com',
                    email: 'rachel363@example.com',
                    password: '123',
                    confirmed: false,
                    "AccountId": 1
                }
                , accId = 1;


            UserService
                .create( newuser )
                .then( function ( user ) {
                    return UserService.resendAccountConfirmation( accId, user.id );
                } )
                .then( function ( data ) {

                    UserService
                        .generatePasswordResetHash
                        .calledOnce
                        .should
                        .be
                        .true;

                    UserService
                        .generatePasswordResetHash
                        .restore();

                    done();
                } )
                .fail( done );
        });

        it.skip( 'should call .mailPasswordRecoveryToken method ', function ( done ) {
            sinon.spy( UserService, "mailPasswordRecoveryToken" );

            var newuser = {
                    username: 'rachel37@example.com',
                    email: 'rachel37@example.com',
                    password: '123',
                    confirmed: false,
                    "AccountId": 1
                }
                , accId = 1;


            UserService
                .create( newuser )
                .then( function ( user ) {
                    return UserService.resendAccountConfirmation( accId, user.id );
                } )
                .then( function ( data ) {

                    UserService
                        .mailPasswordRecoveryToken
                        .calledOnce
                        .should
                        .be
                        .true;

                    UserService
                        .mailPasswordRecoveryToken
                        .restore();

                    done();
                } )
                .fail( done );
        });

        it.skip( 'should return statuscode 200 and a message', function ( done ) {

            var newuser = {
                    username: 'rachel38@example.com',
                    email: 'rachel38@example.com',
                    password: '123',
                    confirmed: false,
                    "AccountId": 1
                }
                , accId = 1;


            UserService
                .create( newuser )
                .then( function ( user ) {
                    return UserService.resendAccountConfirmation( accId, user.id );
                } )
                .then( function ( data ) {

                    should.exist( data );

                    data.should.have.property( 'statuscode', 200 );
                    data.should.have.property( 'message' ).and.not.be.empty;

                    done();
                } )
                .fail( done );
        });
    });
});