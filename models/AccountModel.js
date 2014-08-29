module.exports = function( Model ) {
    return Model.extend( 'Account',
    {
        id: {
            type:           Number,
            primaryKey:     true,
            autoIncrement:  true
        },
        name: {
            type:           String,
            validate: {
                len:        [ 2, 50 ]
            }
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
            allowNull:      true,
            default:        null
        }
    });
};
