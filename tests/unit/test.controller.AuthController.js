var expect      = require( 'chai' ).expect
  , sinon       = require( 'sinon' )
  , injector    = require( 'injector' )
  , authModule
  , Controller
  , Service
  , users = []
  , new_user;

describe( 'CleverAuth.Controller.AuthController', function () {

    before( function( done ) {
        authModule      = injector.getInstance( 'cleverAuth' );
        Controller      = authModule.controllers.AuthController;
        Service         = authModule.services.UserService;

        Service
            .create({
                firstName: 'authControllerUser',
                username: 'authControllerUser@example.com',
                email: 'authControllerUser@example.com',
                password: 'secret_password'
            })
            .then( function( user ) {
                expect( user ).to.be.an( 'object' );
                expect( user ).to.have.property( 'id' );

                users.push( user );

                new_user = user;

                done();
            })
            .catch( done );
    });

    function fakeRequest( req ) {
        req.method  = req.method || 'GET';
        req.url     = req.url || '/user';
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

    it( 'should signIn()', function( done ) {
        var data = {
                username: new_user.email,
                password: 'secret_password'
            }
          , req = fakeRequest({
                url: '/auth/signIn',
                body: data,
                method: 'POST',
                params: {
                    action: 'signIn'
                },
                user: {},
                login: function( user, fn ) {
                    fn( !!user && !!user.id ? null : 'Unknown error' );
                },
                isAuthenticated: function() { return false; }
            })
          , res = fakeResponse(function( status, user ) {
                expect( signIn.called ).to.eql( true );
                expect( auth.called ).to.eql( true );

                signIn.restore();
                auth.restore();

                // Check the result/response
                expect( status ).to.equal( 200 );

                expect( user ).to.be.an( 'object' )
                expect( user ).to.have.property( 'id' );
                expect( user ).to.have.property( 'username' ).and.equal( data.username );
                expect( user ).to.have.property( 'email' ).and.equal( new_user.email );
                expect( user ).to.have.property( 'password' ).and.equal( '2394a9661a9089208c1c9c65ccac85a91da6a859' );

                done();
            })
          , next    = expect.fail
          , signIn  = sinon.spy( Controller.prototype, 'signInAction' )
          , auth    = sinon.spy( Controller, 'authenticate' )
          , ctrl    = null;

        ctrl = Controller.callback( 'newInstance' )( req, res, next );
    });

    it( 'should signOut()', function( done ) {
        var req = fakeRequest({
                url: '/auth/signOut',
                method: 'GET',
                params: {
                    action: 'signOut'
                },
                user: {},
                logout: sinon.spy()
            })
          , res = fakeResponse( function( status, result ) {
                expect( signOut.called ).to.eql( true );
                expect( req.logout.called ).to.eql( true );

                signOut.restore();

                // Check the result/response
                expect( status ).to.equal( 200 );
                expect( result ).to.be.an( 'object' );

                done();
            })
          , next    = expect.fail
          , signOut = sinon.spy( Controller.prototype, 'signOutAction' )
          , ctrl    = null;

        ctrl = Controller.callback( 'newInstance' )( req, res, next );
    });
});