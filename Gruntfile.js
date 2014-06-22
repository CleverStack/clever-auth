'use strict';

var fs      = require( 'fs' )
  , path    = require( 'path' )
  , crypto  = require( 'crypto' )
  , _       = require( 'underscore' );

module.exports = function( grunt ) {
    return [{
        prompt: {
            cleverAuthSeedDataPrompt: {
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
            },
            cleverAuthConfigPrompt: {
                options: {
                    questions: [
                        {
                            config: 'cleverAuthConfig.environment',
                            type: 'list',
                            message: 'What environment is this configuration for?',
                            choices: [
                                { name: 'LOCAL' },
                                { name: 'DEV' },
                                { name: 'STAG' },
                                { name: 'PROD' }
                            ],
                            default: function() {
                                return process.env.NODE_ENV || 'LOCAL';
                            }
                        },
                        {
                            config: 'cleverAuthConfig.secretKey',
                            type: 'input',
                            message: 'Secret key used to secure your passport sessions',
                            default: function() {
                                var text = "";
                                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                                for( var i=0; i < 20; i++ ) {
                                    text += possible.charAt(Math.floor(Math.random() * possible.length));
                                }

                                return text;
                            }
                        },
                        {
                            config: 'cleverAuthConfig.driver',
                            type: 'list',
                            message: 'What database driver module to use',
                            choices: [
                                { name: 'ORM' },
                                { name: 'ODM' }
                            ]
                        },
                        {
                            config: 'cleverAuthConfig.sessionStorageDriver',
                            type: 'list',
                            message: 'Session Storage Driver',
                            choices: [
                                { name: 'redis' },
                                { name: 'memcache' },
                                { name: 'in-memory' }
                            ]
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.host',
                            type: 'input',
                            message: 'Redis host',
                            default: '127.0.0.1'
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.port',
                            type: 'input',
                            message: 'Redis port',
                            default: '6379'
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.prefix',
                            type: 'input',
                            message: 'Redis prefix',
                            default: ''
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.key',
                            type: 'input',
                            message: 'Redis key',
                            default: ''
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.host',
                            type: 'input',
                            message: 'Memcache host',
                            default: '127.0.0.1'
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.port',
                            type: 'input',
                            message: 'Memcache port',
                            default: '6379'
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.prefix',
                            type: 'input',
                            message: 'Memcache prefix',
                            default: ''
                        }
                    ]
                }
            }
        }
    }, function( grunt ) {
        grunt.loadNpmTasks( 'grunt-prompt' );
        
        grunt.registerTask( 'prompt:cleverAuthConfig', [ 'prompt:cleverAuthConfigPrompt', 'createCleverAuthConfig' ] );
        grunt.registerTask( 'createCleverAuthConfig', 'Adds the config for cleverAuth to the designated environment', function ( ) {
            var conf            = grunt.config( 'cleverAuthConfig' )
              , defaultConfig   = require( path.join( __dirname, 'config', 'default.json' ) )
              , env             = conf.environment
              , configFile      = path.resolve( path.join( __dirname, '..', '..', 'config', env + '.json' ) )
              , config          = _.extend( {}, defaultConfig );

            delete conf.environment;

            if ( fs.existsSync( configFile ) ) {
                config = _.extend( config, require( configFile ) );
            }

            if ( config[ 'clever-auth' ].sessionStorageDriver === 'redis' ) {
                delete config[ 'clever-auth' ].memache;
            } else if ( config[ 'clever-auth' ].sessionStorageDriver === 'memcache' ) {
                delete config[ 'clever-auth' ].redis;
            }

            config[ 'clever-auth' ] = _.extend( config[ 'clever-auth' ], conf );

            fs.writeFileSync( configFile, JSON.stringify( config, null, '  ' ) );
        });
        
        grunt.registerTask( 'prompt:cleverAuthSeedData', [ 'prompt:cleverAuthSeedDataPrompt', 'authSeedData' ] );
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

            if ( obj.UserModel[ 0 ] && obj.UserModel[ 0 ].username === 'test' ) {
                obj.UserModel.shift();
            }

            obj.UserModel = obj.UserModel || [];
            obj.UserModel.push( conf );

            fs.writeFileSync( file, JSON.stringify( obj, null, '  ' ) );
        });
    }];
};