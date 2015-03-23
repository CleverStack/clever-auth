var FacebookStrategy = require( 'passport-facebook' ).Strategy;
  , injector         = require('injector');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var facebookEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.facebook
    , facebookConfig  = !!googleEnabled ? cleverAuth.config.enabledStrategies.facebook : false
    , scope          = 'email,user_about_me';
    , state          = +new Date() + ''

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/facebook/?:action/??',
    autoRouting    : facebookEnabled,

    setup: function() {
      if (!!googleEnabled) {
        injector.instance('FacebookStrategy', FacebookStrategy);

        passport.use(new FacebookStrategy({
          clientID: config.facebook.clientId,
          clientSecret: config.facebook.clientSecret,
          callbackURL: config.facebook.redirectURIs,
          scope: scope
        },
        function(accessToken, refreshToken, profile, done) {
          UserFacebookService
            .findOrCreate( profile, accessToken )
            .then( function( fbUser ) {
                return UserFacebookService.authenticate ( fbUser, profile )
            })
            .then( UserFacebookService.updateAccessedDate )
            .then( done.bind( null, null ) )
            .fail( done );
        }));
      }

      return this._super.apply(this, arguments);
    },

    facebookLogin: function(identifier, user, done) {
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
        client_id: config.facebook.clientId,
        redirect_uri: config.facebook.redirectURIs,
        scope: scope
      };

      this.send( { url: 'https://www.facebook.com/dialog/oauth?' + qs.stringify( params ) }, 200 );
    },

    returnAction: function () {
      passport.authenticate('facebook', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
