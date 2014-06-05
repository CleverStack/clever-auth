'use strict';

var fs      = require( 'fs' )
  , path    = require( 'path' )
  , crypto  = require( 'crypto' );

module.exports = function( grunt ) {
    return [{
        prompt: {
            authSeedData: {
                options: {
                    questions: [
                        {
                            config: 'cleverauth.username',
                            type: 'input',
                            message: 'Admin Username',
                            default: 'admin',
                        },
                        {
                            config: 'cleverauth.password',
                            type: 'password',
                            message: 'Admin Users Password',
                            default: 'password'
                        },
                        {
                            config: 'cleverauth.email',
                            type: 'input',
                            message: 'Admin Users Email',
                            default: 'default@email.com'
                        },
                        {
                            config: 'cleverauth.firstname',
                            type: 'input',
                            message: 'Admin Users Firstname',
                            default: 'Admin',
                        },
                        {
                            config: 'cleverauth.lastname',
                            type: 'input',
                            message: 'Admin Users Lastname',
                            default: 'User',
                        },
                        {
                            config: 'cleverauth.phone',
                            type: 'input',
                            message: 'Admin Users Phone Number',
                            default: ''
                        }
                    ]
                }
            }
        }
    }, function( grunt ) {
        grunt.loadNpmTasks( 'grunt-prompt' );

        grunt.registerTask( 'prompt:cleverAuthSeedData', [ 'prompt:authSeedData', 'authSeedData' ] );
        grunt.registerTask( 'authSeedData', 'Creates seed data for clever-auth module', function ( ) {
            var conf = grunt.config( 'cleverauth' )
              , obj  = {
                    'UserModel': []
                }
              , file = path.join( process.cwd(), 'modules', 'clever-auth', 'schema', 'seedData.json' );

            if (fs.existsSync( file )) {
                obj = require( file );
            }

            conf.active = true;
            conf.confirmed = true;
            conf.hasAdminRight = true;
            conf.password = crypto.createHash( 'sha1' ).update( conf.password ).digest( 'hex' );

            if ( obj[ 'UserModel' ][ 0 ] && obj[ 'UserModel' ][ 0 ].username === 'test' ) {
                obj[ 'UserModel' ].shift();
            }

            obj[ 'UserModel' ] = obj[ 'UserModel' ] || [];
            obj[ 'UserModel' ].push( conf );

            fs.writeFileSync( file, JSON.stringify( obj, null, '  ' ) );
        } );
    }];
};