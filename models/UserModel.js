module.exports = function ( Model, config ) {
    return Model.extend( 'User',
    {
        type: config['clever-auth'].driver,
        softDeletable: true,
        timeStampable: true
    },
    {
        id: {
            type: Number,
            primaryKey: true,
            autoIncrement: true
        },
        googleIdentifier: {
            type: String,
            allowNull: true
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
        accessedAt: Date,

        getters: {
            fullName: function() {
                return !!this.firstname && !!this.lastname ? [ this.firstname, this.lastname ].join( ' ' ) : '';
            }
        }
    });
};