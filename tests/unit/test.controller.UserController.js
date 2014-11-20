var expect      = require( 'chai' ).expect
  , sinon       = require( 'sinon' )
  , injector    = require( 'injector' )
  , authModule
  , Controller
  , Service
  , UserService = null
  , users = []
  , new_user;

describe( 'CleverAuth.Controller.UserController', function () {

    before( function( done ) {
        authModule      = injector.getInstance( 'cleverAuth' );
        Controller      = authModule.controllers.UserController;
        Service         = injector.getInstance( 'AccountService' );
        UserService     = injector.getInstance( 'UserService' );

        Service
            .create({
                firstName: 'Joeqwer',
                username: 'joe@example.com',
                email: 'joe@example.com',
                password: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
                confirmed:  true,
                subDomain: 'joe'
            })
            .then( function ( user ) {

                expect( user ).to.be.an( 'object' );
                expect( user ).to.have.property( 'id' );

                users.push( user );

                return Service.create({
                    firstName: 'Racheller',
                    username: 'rachel@example.com',
                    email: 'rachel@example.com',
                    password: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220',
                    confirmed:  true,
                    subDomain: 'rachel'
                });
            })
            .then( function ( user ) {

                expect( user ).to.be.an( 'object' );
                expect( user ).to.have.property( 'id' );

                users.push( user );

                done();
            })
            .catch( done );
    });

    function fakeRequest( req ) {
        req.method  = req.method || 'GET';
        req.url     = req.url || '/auth/user';
        req.query   = req.query || {};
        req.body    = req.body || {};
        req.params  = req.params || {};

        return req;
    }

    function fakeResponse( cb ) {
        return {
            json: function( code, message ) {
                setTimeout( function() {
                    cb( code, JSON.parse( JSON.stringify( message ) ) )                    
                }, 10 );
            },

            send: function( code, message ) {
                setTimeout( function() {
                    cb( code, message )
                }, 10 );
            }
        };
    }

    describe( 'Class.loginRequired() middleware', function() {
        it( 'should call next if req.isAuthenticated() returns true', function ( done ) {
            var req = fakeRequest({
                    url: '/auth/user',
                    params: {
                        action: 'get'
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function() {

                });

            Controller.requiresLogin({ all: true })( req, res, function() {
                expect( req.isAuthenticated() ).to.eql( true );
                done();
            });
        });

        it( 'should send 401 if req.isAuthenticated() returns false', function ( done ) {
            var req = fakeRequest({
                    url: '/auth/user',
                    params: {
                        action: 'get'
                    },
                    isAuthenticated: function () { return false; }
                })
              , res = fakeResponse(function( statusCode, response ) {
                    expect( statusCode ).to.eql( 401 );
                    expect( response ).to.eql( { statusCode: 401, message: 'User is not authenticated!' } );
                    expect( req.isAuthenticated() ).to.eql( false );

                    done();
                })
              , next = function() {
                    
                };

            Controller.requiresLogin({ all: true })( req, res, next );
        });
    });

    describe( 'Class.checkPasswordRecoveryData() middleware', function () {
        it( 'should call next if is right', function ( done ) {
            var req = fakeRequest({
                    body: {
                        userId: 1,
                        password: 'asasasasa',
                        token: '15151saAS5A1S51A51S'
                    }
                })
              , res  = fakeResponse(function(){})
              , next = sinon.spy();

            Controller.checkPasswordRecoveryData( req, res, next );
            expect( next.called ).to.be.eql( true );

            done();
        });

        it( 'should send 400 if no UserId is provided', function ( done ) {
            var req = fakeRequest({
                    body: {
                        password: 'asasasasa',
                        token: '15151saAS5A1S51A51S'
                    }
                })
              , res  = fakeResponse( function( code, result ) {
                    expect( code ).to.eql( 400 );
                    expect( result ).to.be.an( 'string' ).and.to.eql( 'Invalid user Id.' );

                    done();
                })
              , next = sinon.spy();

            Controller.checkPasswordRecoveryData( req, res, next );
            expect( next.called ).to.be.eql( false );
        });

        it( 'should send 400 if no password is provided', function ( done ) {
            var req = fakeRequest({
                    body: {
                        userId: 1,
                        token: '15151saAS5A1S51A51S'
                    }
                })
              , res  = fakeResponse( function( code, result ) {
                    expect( code ).to.eql( 400 );
                    expect( result ).to.be.an( 'string' ).and.to.eql( 'Password does not match the requirements' );

                    done();
                })
              , next = sinon.spy();

            Controller.checkPasswordRecoveryData( req, res, next );
            expect( next.called ).to.be.eql( false );
        });

        it( 'should send 400 if no token is provided', function ( done ) {
            var req = fakeRequest({
                    body: {
                        userId: 1,
                        password: '151515'
                    }
                })
              , res  = fakeResponse( function( code, result ) {
                    expect( code ).to.eql( 400 );
                    expect( result ).to.be.an( 'string' ).and.to.eql( 'Invalid Token.' );

                    done();
                })
              , next = sinon.spy();

            Controller.checkPasswordRecoveryData( req, res, next );
            expect( next.called ).to.be.eql( false );
        });
    });

    describe( 'postAction()', function () {
        it( 'should hash password and save user', function ( done ) {
            var data = {
                    firstName: 'admin',
                    username: 'admin',
                    email: 'admin@example.com',
                    password: 'secret_password',
                    confirmed:  true,
                    subDomain: 'admin',
                    active: true
                }
              , req = fakeRequest({
                    url: '/account',
                    body: data,
                    method: 'POST',
                    params: {
                        action: 'post'
                    },
                    user: { hasAdminRights: false, account: {} },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( statusCode, user ) {
                    expect( statusCode ).to.equal( 200 );

                    expect( user ).to.be.an( 'object' );
                    expect( user ).to.have.property( 'id' );

                    UserService.findAll( { where: { email: data.email } } )
                        .then( function ( users ) {
                            expect( users ).to.be.an( 'array' ).and.have.length( 1 );

                            user = users[0];

                            expect( next.called ).to.eql( false );
                            expect( user ).to.be.an( 'object' )
                            expect( user ).to.have.property( 'id' );
                            expect( user ).to.have.property( 'username' ).and.equal( data.username );
                            expect( user ).to.have.property( 'email' ).and.equal( data.email );
                            expect( user ).to.have.property( 'password' ).and.equal( '2394a9661a9089208c1c9c65ccac85a91da6a859' );

                            done();
                        } )
                        .catch( done );
                })
              , next = sinon.spy()
              , ctrl = null;

            ctrl = injector.getInstance( 'AccountController' ).callback( 'newInstance' )( req, res, next );
        });

        it( 'should get an error if trying to create a user where email already exists in the database', function ( done ) {
            var data = {
                    username: 'admin',
                    email: users[0].email,
                    password: 'secret_password',
                    confirmed:  true,
                    subDomain: 'userControllerUser'
                }
              , req = fakeRequest({
                    url: '/account',
                    body: data,
                    method: 'POST',
                    params: {
                        action: 'post'
                    },
                    user: { hasAdminRights: false, account: {} },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( status, response ) {
                    expect( status ).to.equal( 400 );
                    expect( response ).to.be.an( 'object' ).and.to.eql( { statusCode: 400, message: 'Email joe@example.com already exists' } );

                    done();
                })
              , next = sinon.spy()
              , ctrl = null;

            ctrl = Controller.callback( 'newInstance' )( req, res, next );
        });

        it( 'should get an error if trying to create a user without an email address', function ( done ) {
            var data = {
                    username: 'admin',
                    password: 'secret_password'
                }
              , req = fakeRequest({
                    url: '/auth/user',
                    body: data,
                    method: 'POST',
                    params: {
                        action: 'post'
                    },
                    user: { hasAdminRights: false, account: { id: 4 } },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( status, response ) {
                    expect( status ).to.equal( 400 );
                    expect( response ).to.be.an( 'object' );
                    expect( response ).to.have.property( 'message' ).and.to.eql( 'email is required.' );

                    done();
                })
              , next = sinon.spy()
              , ctrl = null;

            ctrl = Controller.callback( 'newInstance' )( req, res, next );
        });
    });

    describe( 'putAction()', function () {
        before( function( done ) {
            Service
                .create( {
                    firstName: 'cdxsasdf',
                    username: 'xcxcxc@example.com',
                    email: 'sasasas@example.com',
                    password: 'secret_password',
                    AccountId: 1,
                    confirmed:  true,
                    subDomain: 'cdxsasdf'
                })
                .then( function ( user ) {
                    expect( user ).to.be.an( 'object' );
                    expect( user ).to.have.property( 'id' );

                    new_user = user;

                    done();
                })
                .catch( done );
        });

        it( 'should use UserService.update() to update a user', function ( done ) {
            var data = {
                    id: new_user.id,
                    firstname: 'petrushka'
                }
              , req = fakeRequest({
                    url: '/auth/user/' + new_user.id,
                    body: data,
                    method: 'PUT',
                    query: {},
                    params: {
                        action: 'put',
                        id: new_user.id
                    },
                    user: { id: new_user.id, hasAdminRights: true, account: { id: 4 } },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( status, result ) {

                    // Check the result/response
                    expect( status ).to.equal( 200 );
                    expect( result ).to.be.an( 'object' );
                    expect( result ).to.have.property( 'id' ).and.equal( new_user.id );
                    expect( result ).to.have.property( 'firstname' ).and.equal( data.firstname );

                    // Be sure that the password is not getting updated unless changed
                    expect( result ).to.have.property( 'password' ).and.equal( new_user.password );

                    // Check the UserService
                    expect( spy.called ).to.eql( true );
                    expect( spy.calledOnce ).to.eql( true );

                    // Check the arguments the UserService was called with
                    var spyCall = spy.getCall ( 0 ).args;
                    expect( spyCall ).to.be.an( 'array' );
                    expect( spyCall[0] ).to.be.an( 'object' ).and.to.have.property( 'where' ).and.to.have.property( 'id' );
                    expect( spyCall[1] ).to.be.an( 'object' );
                    expect( spyCall[1] ).to.have.property( 'id' ).and.equal( data.id );
                    expect( spyCall[1] ).to.have.property( 'firstname' ).and.equal( data.firstname );

                    spy.restore();

                    done();
                })
              , next = sinon.spy()
              , spy  = sinon.spy( UserService, 'update' )
              , ctrl = null;

            ctrl = Controller.callback( 'newInstance' )( req, res, next );
        });

        it( 'should get an error if trying to update a user without a valid id', function ( done ) {
            var data = {
                    firstname: 'fail'
                }
              , req = fakeRequest({
                    url: '/auth/user/',
                    body: data,
                    method: 'PUT',
                    params: {
                        action: 'put'
                    },
                    user: { hasAdminRights: false, account: { id: 4 } },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( status, result ) {

                    // Check the result/response
                    expect( status ).to.equal( 404 );
                    expect( result ).to.be.an( 'object' );
                    expect( result ).to.have.property( 'message' ).and.equal( 'User doesn\'t exist.' );
                    
                    expect( next.called ).to.eql( false );

                    done();
                })
              , next = sinon.spy()
              , ctrl = null;

            ctrl = Controller.callback( 'newInstance' )( req, res, next );
        });

        it( 'should update the logged in users password', function( done ) {
            var data = {
                    id: new_user.id,
                    new_password: 'foobar'
                }
              , req = fakeRequest({
                    url: '/auth/user/' + new_user.id,
                    body: data,
                    method: 'PUT',
                    query: {},
                    params: {
                        action: 'put',
                        id: new_user.id
                    },
                    user: { id: new_user.id, hasAdminRights: true, account: { id: 4 } },
                    login: function( user, fn ) {
                        fn( !!user && !!user.id ? null : 'Unknown error' );
                    },
                    isAuthenticated: function () { return true; }
                })
              , res = fakeResponse(function( status, result ) {

                    // Check the result/response
                    expect( status ).to.equal( 200 );
                    expect( result ).to.be.an( 'object' );
                    expect( result ).to.have.property( 'id' ).and.equal( new_user.id );
                    expect( result ).to.have.property( 'password' ).and.equal( '8843d7f92416211de9ebb963ff4ce28125932878' );

                    // Check the UserService
                    expect( spy.called ).to.eql( true );
                    expect( spy.calledOnce ).to.eql( true );

                    // Check the arguments the UserService was called with
                    var spyCall = spy.getCall ( 0 ).args;
                    expect( spyCall ).to.be.an( 'array' );
                    expect( spyCall[0] ).to.be.an( 'object' ).and.to.have.property( 'where' ).and.to.have.property( 'id' );
                    expect( spyCall[1] ).to.be.an( 'object' );
                    expect( spyCall[1] ).to.have.property( 'password' );
                    expect( spyCall[1] ).to.not.have.property( 'new_password' );

                    spy.restore();

                    done();
                })
              , next = sinon.spy()
              , spy  = sinon.spy( UserService, 'update' )
              , ctrl = null;

            ctrl = Controller.callback( 'newInstance' )( req, res, next );
        });
    });

    describe( 'listAction()', function () {
        before( function( done ) {
            Service
                .create( {
                    firstName: 'listAction',
                    username: 'listAction@example.com',
                    email: 'listAction@example.com',
                    password: 'secret_password',
                    subDomain: 'listAction',
                    confirmed: true
                })
                .then( function ( user ) {
                    expect( user ).to.be.an( 'object' );
                    expect( user ).to.have.property( 'id' );

                    new_user = user;

                    done();
                })
                .catch( done );
        });

        it( 'Should send all existing users as an array', function( done ) {
            var ctrl        = null
              , lastJson    = JSON.parse( JSON.stringify( new_user ) );

            var req = fakeRequest({
                method: 'GET',
                query: {},
                params: {},
                user: { id: new_user.id, hasAdminRights: true, account: { id: 5 } },
                login: function( user, fn ) {
                    fn( !!user && !!user.id ? null : 'Unknown error' );
                },
                isAuthenticated: function () { return true; }
            });

            var res = fakeResponse( function( code, result ) {
                expect( code ).to.equal( 200 );

                var modelJson = JSON.parse( JSON.stringify( result[ result.length - 1 ] ) );

                Object.keys( lastJson ).forEach( function( key ) {
                    expect( modelJson[ key ] ).to.eql( lastJson[ key ] );
                });

                expect( ctrl.action ).to.equal( 'listAction' );

                done();
            });

            this.timeout( 10000 );
            ctrl = Controller.callback( 'newInstance' )( req, res );
        });
    });

    describe( 'getAction()', function () {
        before( function( done ) {
            Service
                .create( {
                    firstName: 'getAction',
                    username: 'getAction@example.com',
                    email: 'getAction@example.com',
                    password: 'secret_password',
                    subDomain: 'getAction',
                    confirmed: true
                })
                .then( function ( user ) {
                    expect( user ).to.be.an( 'object' );
                    expect( user ).to.have.property( 'id' );

                    new_user = user;

                    done();
                })
                .catch( done );
        });

        it( 'Should be able to get a user by id', function( done ) {
            var ctrl        = null
              , lastJson    = JSON.parse( JSON.stringify( new_user ) );

            var req         = fakeRequest({
                method: 'GET',
                url: '/auth/user/' + new_user.id,
                params: {
                    id: new_user.id
                },
                user: { id: new_user.id, hasAdminRights: true, account: { id: 6 } },
                login: function( user, fn ) {
                    fn( !!user && !!user.id ? null : 'Unknown error' );
                },
                isAuthenticated: function () { return true; }
            });

            var res = fakeResponse( function( code, result ) {
                expect( code ).to.equal( 200 );

                var modelJson = JSON.parse( JSON.stringify( result ) );

                Object.keys( lastJson ).forEach( function( key ) {
                    expect( modelJson[ key ] ).to.eql( lastJson[ key ] );
                });

                expect( ctrl.action ).to.equal( 'getAction' );

                done();
            });

            this.timeout( 10000 );
            ctrl = Controller.callback( 'newInstance' )( req, res );
        });
    });
});
