var Q = require( 'q' )
  , spawn = require( 'child_process' ).spawn
  , path  = require( 'path' )
  , fs    = require( 'fs' )
  , ncp   = require('ncp').ncp;

var prName = 'testProject';

//create test project
function createProject () {
    var defered = Q.defer()
      , proc = spawn ( 'clever', [ 'init', '--allow-root', '--skip-protractor', prName ] );

    console.log( 'step #1 - create test project - begin\n' );

    proc.stdout.on('data', function ( data ) {
        var str = data.toString();  

        if ( str.match( /ing/ ) !== null ) {
            console.log( str )
        } 
    });

    proc.stderr.on('data', function ( data ) {
        console.log( 'Error in step #1 - ' + data.toString() + '\n' );
        defered.reject ( data.toString() ); 
    });

    proc.on( 'close', function ( code ) {
        console.log('step #1 process exited with code ' + code + '\n');
        defered.resolve();
    });

    return defered.promise;
}

//install clever-orm module to test project
function installORM () {
    var defered = Q.defer()
      , proc = spawn ( 'clever', [ 'install', 'clever-orm' ], { cwd: path.join( __dirname, '../', prName ) } );

    console.log( 'step #2 - install clever-orm module - begin\n' );

    proc.stdout.on('data', function (data) {
        var str = data.toString()
          , objs = [
                { reg: /Database username/ , write: 'travis\n' },
                { reg: /Database password/ , write: '\n' },
                { reg: /Database name/     , write: 'test_db\n' },
                { reg: /Database dialect/  , write: '\n' },
                { reg: /Database port/     , write: '3306\n' },
                { reg: /Database host/     , write: '127.0.0.1\n' },
            ];

        if ( str.match( /ing/ ) !== null ) {
            console.log( str )
        } 

        objs.forEach ( function ( obj ) {
            if ( str.match( obj.reg ) !== null ) {
                proc.stdin.write( obj.write );
            } 
        });
    });

    proc.stderr.on('data', function (data) {
        console.log( 'Error in step #2 - ' + data.toString() + '\n');
        defered.reject ( data.toString() );
    });

    proc.on('close', function (code) {
        console.log('step #2 process exited with code ' + code + '\n' );
        defered.resolve();
    });

    return defered.promise;
}

//copy clever-auth module in test project
function copyAuthModule () {
    var defered = Q.defer()
      , fromDir = path.join( __dirname, '../' )
      , toDir   = path.join( __dirname, '../', prName, 'backend', 'modules', 'clever-auth' );

    console.log( 'step #3 - copy clever-auth modyle in test project - begin\n' );

    function copyDir ( from, to ) {
        var files = fs.readdirSync( from );

        if ( !fs.existsSync( to ) ) {
            fs.mkdir( to, function ( err ) {
                if ( err ) {
                    console.log( 'error - ' + err)
                }
            })
        }

        files.forEach ( function ( file ) {
            
            fs.stat( path.join( from, file ), function ( err, stats ) {
                
                if ( err ) {
                    console.log( 'Error in step #3 - ' + err + '\n');
                    defered.reject ( err );
                }

                if ( stats && stats.isFile() ) {
                    copyFile ( path.join( from, file ), path.join( to, file ) );
                }

                if ( stats && stats.isDirectory() && file != prName ) {
                    ncp( path.join( from, file ), path.join( to, file ), function ( err ) {
                        if (err) {
                            console.log( 'Error in step #3 - ' + err + '\n');
                            defered.reject ( err );
                        }
                    });
                }
            }) 
        })
    } 

    function copyFile ( from, to ) {
        var rs = fs.createReadStream( from )
          , ws = fs.createWriteStream( to );
        
        rs.on( 'error', function( err ) {
            console.log( err );
        });

        ws.on( 'error', function(err) {
            console.log( err );
        });
          
        rs.pipe( ws );
    }

    copyDir( fromDir, toDir );

    console.log('step #3 process exited with code 0\n' );
    defered.resolve();

    return defered.promise;
}

//create and update config files
function configFiles(  ) {
    var deferred = Q.defer()
      , ormFile = path.join( __dirname, '../', prName, 'backend', 'modules', 'clever-orm', 'config', 'default.json' )
      , comFile = path.join( __dirname, '../', prName, 'backend', 'config', 'test.json' )
      , ormData = {
            "clever-orm": {
            "db": {
                "username": "travis",
                "password": "",
                "database": "test_db",
                "options": {
                    "host": "127.0.0.1",
                    "dialect": "mysql",
                    "port": 3306
                    },
                },
                "modelAssociations": {}
            }
        }
      , comData = {
            "environmentName": "TEST",
            "memcacheHost": "127.0.0.1:11211",
            "clever-orm": {
                "db": {
                    "username": "travis",
                    "password": "",
                    "database": "test_db",
                    "options": {
                        "dialect": "mysql",
                        "host": "127.0.0.1",
                        "port": "3306"
                    }
                }
            }
        };

    console.log( 'step #4 - create and update config files - begin\n' );

    fs.writeFile ( ormFile, JSON.stringify ( ormData ), function ( err ) {

        if ( err ) {
            console.log( 'Error in step #4 - ' + err + '\n');
            return deferred.reject ( err );
        }

        fs.writeFile ( comFile, JSON.stringify ( comData ), function ( err ) {

            if ( err ) {
                console.log( 'Error in step #4 - ' + err + '\n');
                return deferred.reject ( err );
            }

            console.log('step #4 process exited with code 0\n' );
            deferred.resolve();
        });
    });

    return deferred.promise;    
}

//added clever-auth module in bundledDependencies
function bundled(  ) {
    var deferred = Q.defer()
      , file = path.join( __dirname, '../', prName, 'backend', 'package.json' );

    console.log( 'step #5 - added clever-auth module in bundledDependencies\n' );

    fs.readFile ( file, function ( err, data ) {

        if ( err ) {
            console.log( 'Error in step #5 - ' + err + '\n');
            return deferred.reject ( err );
        }

        data = JSON.parse ( data );

        data.bundledDependencies.push ( 'clever-auth' );

        fs.writeFile ( file, JSON.stringify ( data ), function ( err ) {

            if ( err ) {
                console.log( 'Error in step #5 - ' + err + '\n');
                return deferred.reject ( err );
            }

            console.log('step #5 process exited with code 0\n' );
            deferred.resolve();
        });
    });

    return deferred.promise;    
}

createProject (  )    
    .then ( installORM )
    .then ( copyAuthModule )
    .then ( configFiles )
    .then ( bundled )
    .fail ( function (err) {
        console.log('Error - ' + err );
    });