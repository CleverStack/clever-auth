var passport = require( 'passport' )
  , debug = require( 'debug' )( 'AuthModule' )
  , fs = require( 'fs' )
  , path = require( 'path' )
  , ModuleClass = require( 'classes' ).ModuleClass
  , RedisStore = require( 'connect-redis' )( injector.getInstance( 'express' ) )
  , Module;

Module = ModuleClass.extend({
    store: null,

    preSetup: function () {
        debug( 'Adding passport to the injector...' );

        injector.instance( 'passport', passport );
    },

    preInit: function() {
        debug( 'Setup the redis store...' );

        this.store = new RedisStore({
            host: this.config.redis.host,
            port: this.config.redis.port,
            prefix: this.config.redis.prefix + process.env.NODE_ENV + "_",
            password: this.config.redis.key
        });
    },

    configureApp: function ( app, express ) {
        debug( 'Setting up session management...' );

        // Session management
        app.use( express.cookieParser() );
        app.use( express.session( {
            secret: this.config.secretKey,
            cookie: { secure: false, maxAge: 86400000 },
            store: this.store
        } ) );

        // Initialize passport
        app.use( passport.initialize() );
        app.use( passport.session() );
    },

    preShutdown: function () {
        debug( 'Closing connection to redis store...' );
        this.store.client.quit();
    }
});

module.exports = new Module( 'clever-auth', injector );