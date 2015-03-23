var LinkedInStrategy  = require('passport-linkedin-oauth2').Strategy
  , injector          = require('injector');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var linkedInEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.linkedin
    , linkedInConfig  = !!googleEnabled ? cleverAuth.config.enabledStrategies.linkedin : false
    , scope           = ['r_emailaddress', 'r_basicprofile']
    , state           = +new Date() + ''

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/linkedin/?:action/??',
    autoRouting    : linkedInEnabled,

    setup: function() {
      if (!!googleEnabled) {
        injector.instance('LinkedInStrategy', LinkedInStrategy);

        passport.use(new LinkedInStrategy({
            state        : state,
            scope        : scope,
            clientID     : linkedInConfig.AppKey,
            callbackURL  : linkedInConfig.redirectURIs,
            clientSecret : linkedInConfig.AppSecret
        },
        function(accessToken, refreshToken, profile, done) {

            UserLinkedinService
                .findOrCreate( profile, accessToken )
                .then( function( gUser ) {
                    return UserLinkedinService.authenticate ( gUser, profile )
                })
                .then( UserLinkedinService.updateAccessedDate )
                .then( done.bind( null, null ) )
                .fail( done );
        }));
          new LinkedInStrategy({
            returnURL:  googleConfig.returnUrl,
            realm:      googleConfig.realm
          },
          this.callback('linkedinLogin'))
       );
      }

      return this._super.apply(this, arguments);
    },

    linkedinLogin: function(identifier, user, done) {
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
          response_type: "code",
          client_id: linkedInConfig.AppKey,
          redirect_uri: linkedInConfig.redirectURIs,
          state: state,
          scope: scope
      };

      this.send( { url: 'https://www.linkedin.com/uas/oauth2/authorization?' + qs.stringify( params ) }, 200 );
    },

    returnAction: function () {
      passport.authenticate('linkedin', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
