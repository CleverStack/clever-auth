var fs            = require('fs')
  , path          = require('path')
  , underscore    = require('underscore')
  , defaultConfig = require(path.join(__dirname, '..', '..', 'config', 'default.json'))
  , configFile    = null
  , config        = {};

module.exports    = {
  config: {
    authConfigPrompt: {
      options: {
        questions: [
          // Environment
          {
            type    : 'list',
            config  : 'authConfig.environment',
            message : 'What environment is this configuration for?',
            choices : [
              { name: 'LOCAL' },
              { name: 'TEST' },
              { name: 'DEV' },
              { name: 'STAG' },
              { name: 'PROD' }
            ],
            default : process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : 'LOCAL',
            filter  : function(env) {
              underscore.extend(config, defaultConfig);

              configFile = path.resolve(path.join(process.cwd(), 'config', env.toLowerCase() + '.json'));

              if (fs.existsSync(configFile)) {
                underscore.extend(config, require(configFile));
                
                Object.keys(defaultConfig['clever-auth']).forEach(function(key) {
                  if (typeof config['clever-auth'][key] === 'undefined') {
                    config['clever-auth'][key] = defaultConfig['clever-auth'][key];
                  }
                });
              }

              return true;
            }
          },
          // Secret Key
          {
            type    : 'input',
            config  : 'authConfig.secretKey',
            message : 'Secret key used to secure your passport sessions',
            default : function() {
              var secretKey = config['clever-auth'].secretKey !== '' ? config['clever-auth'].secretKey : '';

              if (secretKey === '') {
                var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

                for(var i=0; i < 20; i++) {
                  secretKey += possible.charAt(Math.floor(Math.random() * possible.length));
                }
              }

              return secretKey;
            }
          },
          // Session Store
          {
            type    : 'list',
            config  : 'authConfig.store',
            message : 'Session Storage Driver',
            choices : [
              { name: 'redis' },
              { name: 'memcache' },
              { name: 'in-memory' }
            ],
            default : function() {
              return config['clever-auth'].store !== '' ? config['clever-auth'].store : 'redis';
            }
          },

          // Redis Session Store
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'redis';
            },
            config  : 'authConfig.redis.host',
            message : 'Redis host',
            default : function() {
              return config['clever-auth'].redis.host !== '' ? config['clever-auth'].redis.host : 'localhost';
            }
          },
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'redis';
            },
            config  : 'authConfig.redis.port',
            message : 'Redis port',
            default : function() {
              return config['clever-auth'].redis.port !== '' ? config['clever-auth'].redis.port : '6379';
            }
          },
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'redis';
            },
            config  : 'authConfig.redis.prefix',
            message : 'Redis prefix',
            default : function() {
              return config['clever-auth'].redis.prefix !== '' ? config['clever-auth'].redis.prefix : '';
            }
          },
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'redis';
            },
            config  : 'authConfig.redis.key',
            message : 'Redis key',
            default : function() {
              return config['clever-auth'].redis.key !== '' ? config['clever-auth'].redis.key : '';
            }
          },

          // Memcached Session Store
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'memcache';
            },
            config  : 'authConfig.memcache.host',
            message : 'Memcache host',
            default : function() {
              return config['clever-auth'].memcache.host !== '' ? config['clever-auth'].memcache.host : 'localhost';
            }
          },
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'memcache';
            },
            config  : 'authConfig.memcache.port',
            message : 'Memcache port',
            default : function() {
              return config['clever-auth'].memcache.port !== '' ? config['clever-auth'].memcache.port : '11211';
            }
          },
          {
            type    : 'input',
            when    : function(answers) {
              return answers['authConfig.store'] === 'memcache';
            },
            config  : 'authConfig.memcache.prefix',
            message : 'Memcache prefix',
            default : function() {
              return config['clever-auth'].memcache.prefix !== '' ? config['clever-auth'].memcache.prefix : '';
            }
          }
        ]
      }
    }
  },
  register: function(grunt) {
    grunt.loadNpmTasks('grunt-prompt');
    
    grunt.registerTask('prompt:cleverAuthConfig', ['prompt:authConfigPrompt', 'createCleverAuthConfig']);
    grunt.registerTask('prompt:cleverAuthConfigPrompt', ['prompt:authConfigPrompt', 'createCleverAuthConfig']);
    grunt.registerTask('createCleverAuthConfig', 'Adds the config for cleverAuth to the designated environment', function createCleverAuthConfig() {
      var conf = grunt.config('authConfig');

      delete conf.environment;

      config['clever-auth'] = underscore.extend(config['clever-auth'], conf);

      if (config['clever-auth'].store !== 'redis') {
        delete config['clever-auth'].redis;
      }

      if (config['clever-auth'].store !== 'memcache') {
        delete config['clever-auth'].memcache;
      }

      fs.writeFileSync(configFile, JSON.stringify(config, null, '  '));
    });
  }
};
