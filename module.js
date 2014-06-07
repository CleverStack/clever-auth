var injector        = require( 'injector' )
  , passport        = require( 'passport' )
  , connectRedis    = require( 'connect-redis' )( injector.getInstance( 'express' ) )
  , Module          = require( 'classes' ).Module;

module.exports = new Module.extend({

    sessionStore: null,

    preSetup: function () {
        if ( !!this.config.redis ) {
            var env = process.env.NODE_ENV ? process.env.NODE_ENV : 'local';

            this.config.redis.prefix = !!this.config.redis.prefix
                ? this.config.redis.prefix + env + '_'
                : env + '_';

            this.debug( 'Configuring connect-redis for use as session storage: ' + JSON.stringify( this.config.redis ) );
            this.sessionStore = new connectRedis( this.config.redis );
        }
    },

    preInit: function() {
        this.debug( 'Adding passport and sessionStore to the injector...' );

        injector.instance( 'passport', passport );
        injector.instance( 'sessionStore', this.sessionStore )
    },

    configureApp: function( app, express ) {
        this.debug( 'Configuring express to use the cookieParser...' );
        app.use( express.cookieParser() );
        
        this.debug( 'Configuring session management...' );

        app.use( 
            express.session({
                secret: this.config.secretKey,
                cookie: { secure: false, maxAge: 86400000 },
                store: this.sessionStore
            })
        );

        this.debug( 'Configuring passport initialize middleware...' );
        app.use( passport.initialize() );

        this.debug( 'Configuring passport session middleware..' );
        app.use( passport.session() );
    },

    preShutdown: function () {
        this.debug( 'Closing session store connection...' );
        this.sessionStore.client.quit();
    }
});