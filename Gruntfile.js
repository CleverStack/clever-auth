'use strict';

var fs      = require( 'fs' )
,   path    = require( 'path' )

module.exports = function( grunt ) {
    return [{
        exec: {
            rebase: {
                cmd: "NODE_PATH=./lib/:./modules/; node modules/clever-orm/bin/rebase.js"
            },
            seed: {
                cmd: "NODE_PATH=./lib/:./modules/; node modules/clever-orm/bin/seedModels.js"
            }
        }
    }, function( grunt ) {
        // Register each command
        grunt.registerTask( 'db:rebase', [ 'exec:rebase' ] );
        grunt.registerTask( 'db:seed', [ 'exec:seed' ] );

        // Register db command (runs one after the other)
        grunt.registerTask( 'db', [ 'db:rebase', 'db:seed' ] );
    }];
};