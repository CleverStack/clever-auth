var Promise = require( 'bluebird' )
  , spawn   = require( 'child_process' ).spawn
  , exec    = require( 'child_process' ).exec
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

        console.log( 'step #2 - install clever-orm module - begin\n' );

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
            console.log( 'Error in step #2 - ' + data.toString() + '\n');
            reject ( data.toString() );
        });

        proc.on('close', function (code) {
            console.log('step #2 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

function copyAuthModule () {
    return new Promise( function( resolve, reject ) {
        var fromDir = path.join( __dirname, '../' )
          , toDir   = path.join( __dirname, '../', prName, 'modules', 'clever-auth' );

        console.log( 'step #3 - copy clever-auth module in test project - begin\n' );

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
                        reject ( err );
                    }

                    if ( stats && stats.isFile() ) {
                        copyFile ( path.join( from, file ), path.join( to, file ) );
                    }

                    if ( stats && stats.isDirectory() && file != prName && file != 'node_modules' ) {
                        ncp( path.join( from, file ), path.join( to, file ), function ( err ) {
                            if (err) {
                                console.log( 'Error in step #3 - ' + err + '\n');
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

        console.log('step #3 process exited with code 0\n' );
        resolve();
    });
}

function addAuthToBundled() {
    return new Promise( function( resolve, reject ) {
        var file = path.join( __dirname, '../', prName, 'package.json' );

        console.log( 'step #4 - added clever-auth module in bundledDependencies\n' );

        fs.readFile ( file, function ( err, data ) {

            if ( err ) {
                console.log( 'Error in step #4 - ' + err + '\n');
                return reject ( err );
            }

            data = JSON.parse ( data );

            data.bundledDependencies.push ( 'clever-auth' );

            fs.writeFile ( file, JSON.stringify ( data, null, '  ' ), function ( err ) {

                if ( err ) {
                    console.log( 'Error in step #4 - ' + err + '\n');
                    return reject ( err );
                }

                console.log('step #4 process exited with code 0\n' );
                resolve();
            });
        });
    });
}

function setupAuthModule() {
    return new Promise( function( resolve, reject ) {
        var proc = spawn( 'clever', [ 'setup' ], { cwd: path.join( __dirname, '../', prName ) } );

        console.log( 'step #5 - clever setup auth module (will install ORM) - begin\n' );

        proc.stderr.on('data', function (data) {
            console.log( 'Error in step #5 - ' + data.toString() + '\n');
            reject ( data.toString() );
        });

        proc.on('close', function (code) {
            console.log('step #5 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

function configureAuthModule() {
    return new Promise( function( resolve, reject ) {
        var objs = [
                { reg: /What environment is this configuration for\?/, write: '\n', done: false },
                { reg: /Secret key used to secure your passport sessions/, write: '\n', done: false },
                { reg: /What database driver module to use\: \(Use arrow keys\)/, write: '\n', done: false },
                { reg: /Session Storage Driver\: \(Use arrow keys\)/, write: '\n', done: false },
                { reg: /Redis host\: \(localhost\)/, write: '\n', done: false },
                { reg: /Redis port\: \(6379\)/, write: '\n', done: false },
                { reg: /Redis prefix\:/, write: '\n', done: false },
                { reg: /Redis key\:/, write: '\n', done: false }
            ]
          , proc = spawn ( 'grunt', [ 'prompt:cleverAuthConfig'], { cwd: path.join( __dirname, '../', prName ) } );

        console.log( 'step #6 - configure clever-auth module - begin\n' );

        proc.stdout.on('data', function (data) {
            var str = data.toString();

            objs.forEach ( function ( obj, i ) {
                if ( obj.done !== true && str.match( obj.reg ) !== null ) {
                    objs[i].done = true;
                    proc.stdin.write( obj.write );
                } 
            });
        });

        proc.stderr.on('data', function (data) {
            console.log( 'Error in step #6 - ' + data.toString() + '\n');
            reject ( data.toString() );
        });

        proc.on('close', function (code) {
            console.log('step #6 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

function seedDataForAuthModule() {
    return new Promise( function( resolve, reject ) {
        var objs = [
                { reg: /Default Username\: \(test\)/, write: '\n', done: false },
                { reg: /Default Users Password\: \(clever\)/, write: '\n', done: false },
                { reg: /Default Users Email\: \(test@cleverstack.io\)/, write: '\n', done: false },
                { reg: /Default Users Firstname\: \(Clever\)/, write: '\n', done: false },
                { reg: /Default Users Lastname\: \(User\)/, write: '\n', done: false },
                { reg: /Default Users Phone Number\:/, write: '\n', done: false },
                { reg: /Default User has admin rights\: \(Y\/n\)/, write: '\n', done: false },
                { reg: /Default User has confirmed their email\: \(Y\/n\)/, write: '\n', done: false },
                { reg: /Default User has an active account\: \(Y\/n\)/, write: '\n', done: false }
            ]
          , proc = spawn ( 'grunt', [ 'prompt:cleverAuthSeed'], { cwd: path.join( __dirname, '../', prName ) } );

        console.log( 'step #7 - grunt prompt:cleverAuthSeed clever-auth module - begin\n' );

        proc.stdout.on('data', function( data ) {
            var str = data.toString();

            objs.forEach ( function( obj, i ) {
                if ( obj.done !== true && str.match( obj.reg ) !== null ) {
                    objs[ i ].done = true;
                    proc.stdin.write( obj.write );
                } 
            });
        });

        proc.stderr.on('data', function( data ) {
            console.log( 'Error in step #7 - ' + data.toString() + '\n');
            reject ( data.toString() );
        });

        proc.on('close', function( code ) {
            console.log( 'step #7 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

function rebaseDb() {
    return new Promise( function( resolve, reject ) {
        var proc = spawn( 'grunt', [ 'db' ], { cwd: path.join( __dirname, '../', prName ) } );

        console.log( 'step #8 - rebase db' );

        proc.stdout.on('data', function( data ) {
            console.log( data.toString() );
        });

        proc.stderr.on('data', function( data ) {
            console.log( 'Error in step #8 - ' + data.toString() + '\n' );
            reject( data.toString() );
        });

        proc.on('close', function( code ) {
            console.log('step #8 process exited with code ' + code + '\n' );
            resolve();
        });
    });
}

createProject() 
    .then( installORM )
    .then( copyAuthModule )
    .then( addAuthToBundled )
    .then( setupAuthModule )
    .then( configureAuthModule )
    .then( seedDataForAuthModule )
    .then( rebaseDb )
    .catch ( function (err) {
        console.log('Error - ' + err );
    });