module.exports = function ( mongoose ) {
    var ModelSchema = new mongoose.Schema({
        title: String,
        username: String,
        email: String,
        password: String,
        firstname: String,
        lastname: String,
        phone: String,
        confirmed: Boolean,
        active: Boolean,
        hasAdminRight: Boolean,
        createdAt: Date,
        accessedAt: Date
    });
 
    return mongoose.model('User', ModelSchema);
};