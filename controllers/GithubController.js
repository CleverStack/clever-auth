var GitHubStrategy = require('passport-github').Strategy
  , injector          = require('injector');

module.exports        = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var githubEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.github
    , githubConfig  = !!googleEnabled ? cleverAuth.config.enabledStrategies.github : false
    , state           = +new Date() + '';

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/github/?:action/??',
    autoRouting    : githubEnabled,

    setup: function() {
      if (!!googleEnabled) {
        injector.instance('GitHubStrategy', GitHubStrategy);

        passport.use(new GitHubStrategy({
            clientID: config.github.clientId,
            clientSecret: config.github.clientSecret,
            callbackURL: config.github.redirectURIs,
            state: state,
            scope: 'user'
        },
        function ( accessToken, refreshToken, profile, done ) {
          UserGithubService
            .findOrCreate( profile, accessToken )
            .then( function( gUser ) {
                return UserGithubService.authenticate ( gUser, profile )
            })
            .then( UserGithubService.updateAccessedDate )
            .then( done.bind( null, null ) )
            .fail( done );
          }
        ));
      }

      return this._super.apply(this, arguments);
    },

    githubLogin: function(identifier, user, done) {
      UserService
        .findOrCreate({
          email            : user.emails[0].value,
          firstName        : user.name.givenName,
          lastName         : user.name.familyName,
          googleIdentifier : identifier
        })
        .then(done)
        .catch(done.bind(null));
    }
  },
  {
    signInAction: function () {
      var params = {
          client_id: config.github.clientId,
          redirect_uri: config.github.redirectURIs,
          scope: 'user',
          state: state
      };

      this.send( { url: 'https://github.com/login/oauth/authorize?' + qs.stringify( params ) }, 200 );
    },

    returnAction: function () {
      passport.authenticate('github', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
