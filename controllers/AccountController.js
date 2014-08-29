module.exports = function( Controller, AccountService, PermissionController, config ) {
    var AccountController = module.exports = Controller.extend(
    /** @Class **/
    {
        service: AccountService,

        route: [
            '[POST] /account/?',
            '/account/:id/?',
            '/account/:id/:action((?!(role|roles|permission|permissions|user|users)).)*/?',
            '/accounts/?',
            '/accounts/:action/?'
        ],

        autoRouting: [
            PermissionController.requiresPermission({
                all: 'Account.$action',
                postAction: null
            })
        ],

        /**
         * Middleware helper function to format data in POST or PUT requests
         * 
         * @param  {Request}  req  The Request Object
         * @param  {Response} res  The response object
         * @param  {Function} next Continue past this middleware
         * @return {void}
         */
        formatData: function( req, res, next ) {
            var accData = req.user.account
              , newData = {
                    name:       req.body.name       || accData.name,
                    logo:       req.body.logo       || accData.logo,
                    info:       req.body.info       || accData.info,
                    email:      req.body.email      || accData.email,
                    themeColor: req.body.themeColor || accData.themeColor
                };

            req.body = newData;
            next();
        },

        /**
         * Middleware helper function for requiring a unique subDomain for a given POST request
         * 
         * @param  {Request}  req  The Request Object
         * @param  {Response} res  The response object
         * @param  {Function} next Continue past this middleware
         * @return {void}
         */
        requiresUniqueSubdomain: function( req, res, next ){
            var subdomain = req.body.subdomain;

            if ( !subdomain ) {
                return res.json( 400, "Company subdomain is mandatory!" );
            }

            AccountService
                .find({
                    where: {
                        subdomain: subdomain
                    }
                })
                .then( function( result ){
                    if( result.length ){
                        return res.json( 403, 'This URL "' + subdomain + '" is already taken' );
                    }
                    next();
                })
                .catch( function(){
                    return res.json( 500, 'There was an error: ' + err );
                });
        },

        isValidEmailDomain : function( req, res, next ){
            if ( !!config[ 'clever-subscription' ].account.enabled ) {
                var data = req.body
                  , pattern = new RegExp( config[ 'clever-subscription' ].account.blockedEmailDomains );

                if( !data.email ){
                    res.send(400, 'Email is mandatory' );
                    return;
                }

                if( pattern.test( data.email ) ){
                    return res.send( 400, 'Please register with your corporate email address.' );
                }

                next();
            } else {
                next();
            }
        }
    },
    /** @Prototype **/
    {
        listAction: function() {
            this.req.query.id = this.req.user.account.id;
            this._super.apply( this, arguments );
        },

        getAction: function() {
            if ( this.req.params.id != this.req.user.account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this._super.apply( this, arguments );
        },

        postAction: function () {
            if ( !!this.req.body.id ) {
                return this._super.apply( this, arguments );
            }

            return AccountService
                .create( this.req.body )
                .then( this.proxy( function( user ) {
                    require( 'clever-auth' ).controllers.AuthController.authenticate.apply( this, [ null, user ] );
                }))
                .catch( this.proxy( 'handleServiceMessage' ) )
        },

        putAction: function() {
            if ( this.req.params.id !== this.req.user.account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this.req.params.id = this.req.user.account.id;
            this._super.apply( this, arguments );
        },

        deleteAction: function() {
            if ( this.req.params.id !== this.req.user.account.id ) {
                return this.handleServiceMessage({ statuscode: 400, message: this.Class.service.model._name + " doesn't exist." })
            }
            this._super.apply( this, arguments );
        }
    });
}
