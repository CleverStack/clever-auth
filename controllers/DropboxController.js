var DropboxOAuth2Strategy = require( 'passport-dropbox-oauth2' ).Strategy;
  , injector              = require('injector');

module.exports = function(Controller, AuthController, UserService, cleverAuth, passport) {
  var dropboxEnabled = !!cleverAuth.config.enabledStrategies && !!cleverAuth.config.enabledStrategies.dropbox
    , dropboxConfig  = !!googleEnabled ? cleverAuth.config.enabledStrategies.dropbox : false
    , scope           = ['r_emailaddress', 'r_basicprofile']
    , state           = +new Date() + ''

  return Controller.extend({
    restfulRouting : false,
    route          : '[GET,POST] /auth/dropbox/?:action/??',
    autoRouting    : dropboxEnabled,

    setup: function() {
      if (!!googleEnabled) {
        injector.instance('DropboxOAuth2Strategy', DropboxOAuth2Strategy);

        passport.use(new DropboxOAuth2Strategy({
          clientID     : config.dropbox.AppKey,
          clientSecret : config.dropbox.AppSecret,
          callbackURL  : config.dropbox.redirectURIs,
          state        : state
        },
        function(accessToken, refreshToken, profile, done) {
          UserDropboxService
              .findOrCreate( profile, accessToken )
              .then( function( gUser ) {
                  return UserDropboxService.authenticate ( gUser, profile )
              })
              .then( UserDropboxService.updateAccessedDate )
              .then( done.bind( null, null ) )
              .fail( done );
          }
        ));
      }

      return this._super.apply(this, arguments);
    },

    dropboxLogin: function(identifier, user, done) {
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
          client_id: config.dropbox.AppKey,
          redirect_uri: config.dropbox.redirectURIs,
          state: state
      };

      this.send( { url: 'https://www.dropbox.com/1/oauth2/authorize?' + qs.stringify( params ) }, 200 );
    },

    returnAction: function () {
      passport.authenticate('dropbox-oauth2', this.proxy(AuthController.authenticate, null))(this.req, this.res, this.next);
    }
  });
};
