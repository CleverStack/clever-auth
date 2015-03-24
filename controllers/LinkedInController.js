var Strategy   = require('passport-linkedin-oauth2').Strategy
  , injector   = require('injector')
  , qs         = require('qs');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var enabled  = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.linkedIn
    , config   = !!enabled ? cleverAuth.config.enabledStrategies.linkedIn : false
    , state    = +new Date() + '';

  return Controller.extend({
    route          : '[GET,POST] /auth/linkedIn/?:action?/?',
    autoRouting    : enabled,
    restfulRouting : false,

    setup: function() {
      if (!!enabled) {
        injector.instance('LinkedInStrategy', Strategy);

        passport.use(
          new Strategy({
            state        : state,
            scope        : config.scope,
            clientID     : config.AppKey,
            callbackURL  : config.redirectURIs,
            clientSecret : config.AppSecret
          },
          this.callback('linkedInLogin'))
        );
      }

      return this._super.apply(this, arguments);
    },

    linkedInLogin: function(accessToken, refreshToken, profile, done) {
      // @todo - does this actually work?
      UserService
        .findOrCreate(profile, accessToken)
        .then(done)
        .catch(done.bind(null));
    }
  },
  {
    signInAction: function () {
      var params = {
        state           : state,
        scope           : config.scope,
        'client_id'     : config.AppKey,
        'redirect_uri'  : config.redirectURIs,
        'response_type' : 'code',
      };

      this.send({url: 'https://www.linkedin.com/uas/oauth2/authorization?' + qs.stringify(params)}, 200);
    },

    returnAction: function () {
      passport.authenticate('linkedin', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
