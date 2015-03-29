var injector        = require('injector')
  , session         = require('express-session')
  , cookieParser    = require('cookie-parser')
  , passport        = require('passport')
  , Module          = require('classes').Module;

var cleverAuthModule = Module.extend({

  sessionStore: null,

  preSetup: function () {
    var env          = process.env.NODE_ENV ? process.env.NODE_ENV : 'local'
      , storeDriver  = this.config.store;

    this.debug('Using ' + storeDriver + ' as store...');
    if (storeDriver === 'redis') {
      this.setupRedisSessionStore(env, this.config.redis);
    } else if (storeDriver === 'memcache') {
      this.setupMemcacheSessionStore(env, this.config.memcache);
    }
  },

  setupRedisSessionStore: function(env, redisConfig) {
    this.debug('Configuring connect-redis for use as session storage: ' + JSON.stringify(redisConfig));

    redisConfig.prefix = !!redisConfig.prefix ? redisConfig.prefix + env + '_' : env + '_';
    this.sessionStore = new (require('connect-redis')(session))(redisConfig);
  },

  setupMemcacheSessionStore: function(env, memcacheConfig) {
    this.debug('Configuring connect-memcached for use as session storage: ' + JSON.stringify(memcacheConfig));

    memcacheConfig.prefix = !!memcacheConfig.prefix ? memcacheConfig.prefix + env + '_' : env + '_';
    this.sessionStore = new (require('connect-memcached')(session))(memcacheConfig);
  },

  preInit: function() {
    this.debug('Adding passport and sessionStore to the injector...');

    injector.instance('passport', passport);
    injector.instance('sessionStore', this.sessionStore);
  },

  configureApp: function(app) {
    this.debug('Configuring express to use the cookieParser...');
    app.use(cookieParser());
    
    this.debug('Configuring session management...');

    var sessionConfig = {
      secret: this.config.secretKey,
      cookie: { secure: false, maxAge: 86400000 },
      resave: false,
      saveUninitialized: false
    };

    if (this.config.store !== 'in-memory') {
      sessionConfig.store = this.sessionStore;
    }

    app.use(session(sessionConfig));

    this.debug('Configuring passport initialize middleware...');
    app.use(passport.initialize());

    this.debug('Configuring passport session middleware..');
    app.use(passport.session());

    this.emit('appReady');
  },

  preShutdown: function () {
    this.debug('Closing session store connection...');
    this.sessionStore.client.quit();
  }
});

module.exports = cleverAuthModule;
