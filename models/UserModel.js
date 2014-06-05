module.exports = function ( Model ) {
    return Model.extend( 'User', {
        id: {
            type: Number,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: String
        },
        username: {
            type: String,
            unique: true,
            required: true
        },
        email: {
            type: String,
            unique: true,
            required: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: String
        },
        firstname: {
            type: String,
            allowNull: true
        },
        lastname: {
            type: String,
            allowNull: true
        },
        phone: {
            type: String,
            allowNull: true
        },
        confirmed: {
            type: Boolean,
            default: false
        },
        active: {
            type: Boolean,
            default: true
        },
        hasAdminRight: {
            type: Boolean,
            default: false
        },

        fullName: function() {
            return [ this._model.values.firstname, this._model.values.lastname ].join( ' ' );
        },

        toJSON: function() {
            var values = this._model.values;
            values.fullName = this.fullName();
            delete values.password;
            return values;
        }
    });
};