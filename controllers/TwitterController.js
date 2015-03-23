var TwitterStrategy = require('passport-twitter').Strategy;
  , qs = require ( 'qs' )
  , request = require ( 'request' )
  , injector          = require('injector');

module.exports        = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var twitterEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.twitter
    , twitterConfig  = !!twitterEnabled ? cleverAuth.config.enabledStrategies.twitter : false
    , state           = +new Date() + '';

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/twitter/?:action/??',
    autoRouting    : twitterEnabled,

    setup: function() {
      if (!!twitterEnabled) {
        injector.instance('TwitterStrategy', TwitterStrategy);

        passport.use(new TwitterStrategy({
            consumerKey: config.twitter.APIKey,
            consumerSecret: config.twitter.APISecret,
            callbackURL: config.twitter.redirectURIs
        },
        function ( token, tokenSecret, profile, done ) {

          UserTwitterService
              .findOrCreate( profile, accessToken )
              .then( function( twUser ) {
                  return UserTwitterService.authenticate ( twUser, profile )
              })
              .then( UserTwitterService.updateAccessedDate )
              .then( done.bind( null, null ) )
              .fail( done );
        }));
      }

      return this._super.apply(this, arguments);
    },

    twitterLogin: function(identifier, user, done) {
      UserService
        .findOrCreate({
          email            : user.emails[0].value,
          firstName        : user.name.givenName,
          lastName         : user.name.familyName,
          twitterIdentifier : identifier
        })
        .then(done)
        .catch(done.bind(null));
    }
  },
  {
    signInAction: function () {
      var self = this

      var params = {
            callback: config.twitter.redirectURIs,
            consumer_key: config.twitter.APIKey,
            consumer_secret: config.twitter.APISecret
          }
        , url = 'https://api.twitter.com/oauth/request_token';

      request.post ( { url: url, oauth: params }, function ( err, req, body ) {

        var token = qs.parse( body )
          , url = 'https://api.twitter.com/oauth/authenticate?';

        var params = {
          oauth_token: token.oauth_token
        };

        self.send( { url: url + qs.stringify( params ) }, 200 );

      });
    },

    returnAction: function () {
      passport.authenticate('twitter', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
