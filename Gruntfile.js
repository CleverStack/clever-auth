'use strict';

var fs      = require( 'fs' )
  , path    = require( 'path' )
  , crypto  = require( 'crypto' )
  , _       = require( 'underscore' );

module.exports = function( grunt ) {
    var defaultConfig   = require( path.join( __dirname, 'config', 'default.json' ) )
      , configFile      = null
      , config          = {}
      , authSeedFile    = path.join( process.cwd(), 'modules', 'clever-auth', 'schema', 'seedData.json' )
      , seedFile        = path.join( process.cwd(), 'schema', 'seedData.json' )
      , seed            = {}
      , foundUser       = false;

    if ( fs.existsSync( authSeedFile ) ) {
        _.extend( seed, require( authSeedFile ) );
    }

    if ( fs.existsSync( seedFile ) ) {
        _.extend( seed, require( seedFile ) );
    }

    return [{
        prompt: {
            authConfigPrompt: {
                options: {
                    questions: [
                        {
                            config: 'cleverAuthConfig.environment',
                            type: 'list',
                            message: 'What environment is this configuration for?',
                            choices: [
                                { name: 'LOCAL' },
                                { name: 'TEST' },
                                { name: 'DEV' },
                                { name: 'STAG' },
                                { name: 'PROD' }
                            ],
                            default: function() {
                                return process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : 'LOCAL';
                            },
                            filter: function( env ) {
                                _.extend( config, defaultConfig );

                                configFile = path.resolve( path.join( __dirname, '..', '..', 'config', env.toLowerCase() + '.json' ) );

                                if ( fs.existsSync( configFile ) ) {
                                    _.extend( config, require( configFile ) );
                                    
                                    Object.keys( defaultConfig[ 'clever-auth' ] ).forEach( function( key ) {
                                        if ( typeof config[ 'clever-auth' ][ key ] === 'undefined' ) {
                                            config[ 'clever-auth' ][ key ] = defaultConfig[ 'clever-auth' ][ key ];
                                        }
                                    });
                                }

                                return true;
                            }
                        },
                        {
                            config: 'cleverAuthConfig.secretKey',
                            type: 'input',
                            message: 'Secret key used to secure your passport sessions',
                            default: function() {
                                var secretKey = config[ 'clever-auth' ].secretKey !== '' ? config[ 'clever-auth' ].secretKey : '';

                                if ( secretKey === '' ) {
                                    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                                    for( var i=0; i < 20; i++ ) {
                                        secretKey += possible.charAt(Math.floor(Math.random() * possible.length));
                                    }
                                }

                                return secretKey;
                            }
                        },
                        {
                            config: 'cleverAuthConfig.driver',
                            type: 'list',
                            message: 'What database driver module to use',
                            choices: [
                                { name: 'ORM' },
                                { name: 'ODM' }
                            ],
                            default: function() {
                                return config[ 'clever-auth' ].driver !== '' ? config[ 'clever-auth' ].driver : 'ORM';
                            }
                        },
                        {
                            config: 'cleverAuthConfig.sessionStorageDriver',
                            type: 'list',
                            message: 'Session Storage Driver',
                            choices: [
                                { name: 'redis' },
                                { name: 'memcache' },
                                { name: 'in-memory' }
                            ],
                            default: function() {
                                return config[ 'clever-auth' ].sessionStorageDriver !== '' ? config[ 'clever-auth' ].sessionStorageDriver : 'redis';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.host',
                            type: 'input',
                            message: 'Redis host',
                            default: function() {
                                return config[ 'clever-auth' ].redis.host !== '' ? config[ 'clever-auth' ].redis.host : 'localhost';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.port',
                            type: 'input',
                            message: 'Redis port',
                            default: function() {
                                return config[ 'clever-auth' ].redis.port !== '' ? config[ 'clever-auth' ].redis.port : '6379';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.prefix',
                            type: 'input',
                            message: 'Redis prefix',
                            default: function() {
                                return config[ 'clever-auth' ].redis.prefix !== '' ? config[ 'clever-auth' ].redis.prefix : '';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'redis';
                            },
                            config: 'cleverAuthConfig.redis.key',
                            type: 'input',
                            message: 'Redis key',
                            default: function() {
                                return config[ 'clever-auth' ].redis.key !== '' ? config[ 'clever-auth' ].redis.key : '';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.host',
                            type: 'input',
                            message: 'Memcache host',
                            default: function() {
                                return config[ 'clever-auth' ].memcache.host !== '' ? config[ 'clever-auth' ].memcache.host : 'localhost';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.port',
                            type: 'input',
                            message: 'Memcache port',
                            default: function() {
                                return config[ 'clever-auth' ].memcache.port !== '' ? config[ 'clever-auth' ].memcache.port : '11211';
                            }
                        },
                        {
                            when: function( answers ) {
                                return answers[ 'cleverAuthConfig.sessionStorageDriver' ] === 'memcache';
                            },
                            config: 'cleverAuthConfig.memcache.prefix',
                            type: 'input',
                            message: 'Memcache prefix',
                            default: function() {
                                return config[ 'clever-auth' ].memcache.prefix !== '' ? config[ 'clever-auth' ].memcache.prefix : '';
                            }
                        }
                    ]
                }
            },
            authSeedDataPrompt: {
                options: {
                    questions: [
                        {
                            config: 'cleverauth.username',
                            type: 'input',
                            message: 'Default Username',
                            default: 'test',
                        },
                        {
                            type: 'confirm',
                            config: 'cleverauth.overwrite',
                            message: 'Overwrite existing user with the same username?',
                            when: function( answers ) {
                                seed.UserModel.forEach( function( user, i ) {
                                    if ( user.username === answers[ 'cleverauth.username' ] ) {
                                        foundUser = i;
                                    }
                                });

                                return foundUser !== false;
                            }
                        },
                        {
                            config: 'cleverauth.password',
                            type: 'password',
                            message: 'Default Users Password',
                            default: 'clever',
                            when: function( answers ) {
                                if ( answers[ 'cleverauth.overwrite' ] === undefined || answers[ 'cleverauth.overwrite' ] === true ) {
                                    return true;
                                } else {
                                    grunt.fail.fatal( 'Username `' + answers[ 'cleverauth.username' ] + '` already exists in seed data and you chose not to overwrite it!' );
                                }
                            }
                        },
                        {
                            config: 'cleverauth.email',
                            type: 'input',
                            message: 'Default Users Email',
                            default: 'test@cleverstack.io'
                        },
                        {
                            type: 'confirm',
                            config: 'cleverauth.overwrite',
                            message: 'Overwrite existing user with the same email?',
                            when: function( answers ) {
                                if ( answers[ 'cleverauth.overwrite' ] === true ) {
                                    return false;
                                } else {
                                    seed.UserModel.forEach( function( user, i ) {
                                        if ( user.email === answers[ 'cleverauth.email' ] ) {
                                            foundUser = i;
                                        }
                                    });

                                    return foundUser !== false;
                                }
                            }
                        },
                        {
                            config: 'cleverauth.firstname',
                            type: 'input',
                            message: 'Default Users Firstname',
                            default: 'Clever',
                            when: function( answers ) {
                                if ( answers[ 'cleverauth.overwrite' ] === undefined || answers[ 'cleverauth.overwrite' ] === true ) {
                                    return true;
                                } else {
                                    grunt.fail.fatal( 'Email `' + answers[ 'cleverauth.email' ] + '` already exists in seed data and you chose not to overwrite it!' );
                                }
                            }
                        },
                        {
                            config: 'cleverauth.lastname',
                            type: 'input',
                            message: 'Default Users Lastname',
                            default: 'User',
                        },
                        {
                            config: 'cleverauth.phone',
                            type: 'input',
                            message: 'Default Users Phone Number',
                            default: ''
                        },
                        {
                            config: 'cleverauth.hasAdminRight',
                            type: 'confirm',
                            message: 'Default User has admin rights'
                        },
                        {
                            config: 'cleverauth.confirmed',
                            type: 'confirm',
                            message: 'Default User has confirmed their email'
                        },
                        {
                            config: 'cleverauth.active',
                            type: 'confirm',
                            message: 'Default User has an active account'
                        }
                    ]
                }
            }
        }
    }, function( grunt ) {
        grunt.loadNpmTasks( 'grunt-prompt' );
        
        grunt.registerTask( 'prompt:cleverAuthConfig', [ 'prompt:authConfigPrompt', 'createCleverAuthConfig' ] );
        grunt.registerTask( 'createCleverAuthConfig', 'Adds the config for cleverAuth to the designated environment', function ( ) {
            var conf = grunt.config( 'cleverAuthConfig' );

            delete conf.environment;

            config[ 'clever-auth' ] = _.extend( config[ 'clever-auth' ], conf );

            if ( config[ 'clever-auth' ].sessionStorageDriver !== 'redis' ) {
                delete config[ 'clever-auth' ].redis;
            }

            if ( config[ 'clever-auth' ].sessionStorageDriver !== 'memcache' ) {
                delete config[ 'clever-auth' ].memcache;
            }

            fs.writeFileSync( configFile, JSON.stringify( config, null, '  ' ) );
        });
        
        grunt.registerTask( 'prompt:cleverAuthSeed', [ 'prompt:authSeedDataPrompt', 'authSeedData' ] );
        grunt.registerTask( 'authSeedData', 'Creates seed data for clever-auth module', function() {
            var conf = grunt.config( 'cleverauth' );

            // Make sure the required array is there
            seed.UserModel = seed.UserModel || [];

            // Remove the user if there is a duplicate
            if ( foundUser !== false ) {
                seed.UserModel.splice( foundUser, 1 );
            }
            delete conf.overwrite;

            // Update the password hash
            conf.password = crypto.createHash( 'sha1' ).update( conf.password ).digest( 'hex' );

            seed.UserModel.push( conf );

            fs.writeFileSync( seedFile, JSON.stringify( seed, null, '  ' ) );

            console.log( 'You should run `clever grunt db clever-auth` to rebase and seed this data in your database...' );
        });
    }];
};