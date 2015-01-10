module.exports = function( Model, config ) {
    return Model.extend( 'Account',
    {
        type:               config[ 'clever-auth' ].driver || 'ORM',
        softDeletable:      true,
        timeStampable:      true
    },
    {
        id: {
            type:           Number,
            primaryKey:     true,
            autoIncrement:  true
        },
        name: {
            type:           String,
            default:        null
        },
        email: {
            type:           String,
            required:       true,
            validate: {
                isEmail:    true
            }
        },
        active: {
            type:           Boolean,
            allowNull:      false,
            defaultValue:   false
        },
        subDomain: {
            type:           String,
            required:       true,
            unique:         true
        }
    });
};
