var Strategy   = require('passport-google').Strategy
  , injector   = require('injector');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var enabled  = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.google
    , config   = !!enabled ? cleverAuth.config.enabledStrategies.google : false;

  return Controller.extend({
    route          : '[GET,POST] /auth/google/:action/?',
    autoRouting    : enabled,
    restfulRouting : false,

    setup: function() {
      if (!!enabled) {
        injector.instance('GoogleStrategy', Strategy);

        passport.use(
          new Strategy({
            realm     : config.realm,
            returnURL : config.returnUrl
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
