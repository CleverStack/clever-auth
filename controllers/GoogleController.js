var GoogleStrategy  = require('passport-google').Strategy
  , injector        = require('injector');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var googleEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.google
    , googleConfig  = !!googleEnabled ? cleverAuth.config.enabledStrategies.google : false;

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/google/:action/?',
    autoRouting    : googleEnabled,

    setup: function() {
      if (!!googleEnabled) {
        injector.instance('GoogleStrategy', GoogleStrategy);

        passport.use(
          new GoogleStrategy({
            returnURL:  googleConfig.returnUrl,
            realm:      googleConfig.realm
          },
          this.callback('googleLogin'))
       );
      }

      return this._super.apply(this, arguments);
    },

    googleLogin: function(identifier, user, done) {
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
      passport.authenticate('google')(this.req, this.res, this.next);
    },

    returnAction: function () {
      passport.authenticate('google', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
