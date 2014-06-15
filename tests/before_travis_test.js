var Promise = require( 'bluebird' )
  , spawn   = require( 'child_process' ).spawn
  , path    = require( 'path' )
  , fs      = require( 'fs' )
  , rimraf  = require( 'rimraf' )
  , ncp     = require( 'ncp' ).ncp
  , prName  = 'testProject';

function createProject() {
    return new Promise( function( resolve, reject ) {
        var proc = spawn ( 'clever', [ 'init', '-f', '-A', prName, 'backend' ] );

        console.log( 'step #1 - create test project - begin\n' );

        proc.stdout.on('data', function ( data ) {
            var str = data.toString();  

            if ( str.match( /ing/ ) !== null ) {
                console.log( str )
            }
        });

        proc.stderr.on('data', function ( data ) {
            console.log( 'Error in step #1 - ' + data.toString() + '\n' );
            reject ( data.toString() ); 
        });

        proc.on( 'close', function ( code ) {
            console.log('step #1 process exited with code ' + code + '\n');
            resolve();
        });
    });
}

function installORM() {
    return new Promise( function( resolve, reject ) {
        var objs = [
                { reg: /Database username/ , write: 'travis\n'   , done: false },
                { reg: /Database password/ , write: '\n'         , done: false },
                { reg: /Database name/     , write: 'test_db\n'  , done: false },
                { reg: /Database dialect/  , write: '\n'         , done: false },
                { reg: /Database port/     , write: '3306\n'     , done: false },
                { reg: /Database host/     , write: '127.0.0.1\n', done: false },
            ]
          , proc = spawn ( 'clever', [ 'install', 'clever-orm' ], { cwd: path.join( __dirname, '../', prName ) } );

        console.log( 'step #4 - install clever-orm module - begin\n' );

        proc.stdout.on('data', function (data) {
            var str = data.toString();

            if ( str.match( /ing/ ) !== null ) {
                console.log( str )
            } 

            objs.forEach ( function ( obj, i ) {
                if ( obj.done !== true && str.match( obj.reg ) !== null ) {
                    objs[i].done = true;
                    proc.stdin.write( obj.write );
                } 
            });
        });

        proc.stderr.on('data', function (data) {
            console.log( 'Error in step #4 - ' + data.toString() + '\n');
            reject ( data.toString() );
        });

        proc.on('close', function (code) {
            console.log('step #4 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

//copy clever-auth module in test project
function copyAuthModule () {
    return new Promise( function( resolve, reject ) {
        var fromDir = path.join( __dirname, '../' )
          , toDir   = path.join( __dirname, '../', prName, 'modules', 'clever-auth' );

        console.log( 'step #2 - copy clever-auth module in test project - begin\n' );

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
                        console.log( 'Error in step #2 - ' + err + '\n');
                        reject ( err );
                    }

                    if ( stats && stats.isFile() ) {
                        copyFile ( path.join( from, file ), path.join( to, file ) );
                    }

                    if ( stats && stats.isDirectory() && file != prName ) {
                        ncp( path.join( from, file ), path.join( to, file ), function ( err ) {
                            if (err) {
                                console.log( 'Error in step #2 - ' + err + '\n');
                                reject ( err );
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

        console.log('step #2 process exited with code 0\n' );
        resolve();
    });
}

function bundled() {
    return new Promise( function( resolve, reject ) {
        var file = path.join( __dirname, '../', prName, 'package.json' );

        console.log( 'step #3 - added clever-auth module in bundledDependencies\n' );

        fs.readFile ( file, function ( err, data ) {

            if ( err ) {
                console.log( 'Error in step #3 - ' + err + '\n');
                return reject ( err );
            }

            data = JSON.parse ( data );

            data.bundledDependencies.push ( 'clever-auth' );

            fs.writeFile ( file, JSON.stringify ( data ), function ( err ) {

                if ( err ) {
                    console.log( 'Error in step #3 - ' + err + '\n');
                    return reject ( err );
                }

                console.log('step #3 process exited with code 0\n' );
                resolve();
            });
        });
    });
}

createProject (  )    
    .then ( copyAuthModule )
    .then ( bundled )
    .then ( installORM )
    .catch ( function (err) {
        console.log('Error - ' + err );
    });