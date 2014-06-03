module.exports = function (
    app,
//    AccountController,
    UserController )
{
    app.all( '/user/current', UserController.attach() );

//    app.post('/users/confirm',      UserController.checkPasswordRecoveryData,   UserController.attach());
//    app.get('/users/:id',           UserController.requiresLogin,               UserController.isUserInTheSameAccount, UserController.attach());
//    app.put('/users/:id',           UserController.requiresLogin,               UserController.isUserInTheSameAccount, UserController.attach());
//    app.post('/users/:id',          UserController.requiresLogin,               UserController.isUserInTheSameAccount, UserController.attach());
//    app.post('/users/:id/resend',   UserController.requiresAdminRights,         UserController.attach());
//    app.post('/user/reset',         UserController.checkPasswordRecoveryData,   UserController.attach());
//    app['delete']('/users/:id',     UserController.requiresLogin,               UserController.isUserInTheSameAccount, UserController.attach());
//    app.put('/account',             UserController.requiresLogin,               AccountController.formatData, AccountController.attach());
//    app.post('/account',            AccountController.isValidEmailDomain,       AccountController.requiresUniqueSubdomain, AccountController.requiresUniqueUser, AccountController.attach());

};