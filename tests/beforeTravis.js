var Promise = require('bluebird')
  , spawn   = require('child_process').spawn
  , path    = require('path')
  , fs      = require('fs')
  , rimraf  = require('rimraf')
  , ncp     = require('ncp').ncp
  , prName  = 'testProject'
  , step    = 0;

function createProject() {
  step++;
  return new Promise(function(resolve, reject) {
    var proc = spawn('clever', [ 'init', '-f', '-A', prName, 'backend' ], {cwd: path.resolve(path.join(__dirname, 'assets'))});

    console.log('step #' + step + ' - create test project - begin');

    proc.stdout.on('data', function (data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }
    });

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString());
      reject(data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code);
      resolve();
    });
  });
}

function cleverSetup() {
  return new Promise(function(resolve, reject) {
    var proc = spawn ('clever', [ 'setup' ], { cwd: path.resolve(path.join(__dirname, 'assets', prName)) });
    console.log('step #' + step + ' - clever setup');

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code + '\n');
      resolve();
    });
  });
}

function installTestModule() {
  step++;
  return new Promise(function(resolve, reject) {
    var source      = path.resolve(path.join(__dirname, 'assets', prName, 'tests', 'unit', 'test-module'))
      , dest        = path.resolve(path.join(__dirname, 'assets', prName, 'modules', 'test-module'));

    console.log('step #' + step + ' - install test-module - begin');

    rimraf(dest, function(e) {
      if (e === null) {
        ncp(source, dest, function(err) {
          if (err !== null) {
            console.log('Error in step #' + step + ' - ' + err);
            reject(e);
          } else {
            console.log('step #' + step + ' - completed');
            resolve();
          }
        });
      } else {
        console.log('Error in step #' + step + ' - ' + e);
        reject();
      }
    });

  });
}

function installORM() {
  step++;
  return new Promise(function(resolve, reject) {
    var objs = [
        { reg: /What environment is this configuration for\?/, write: '\n', done: false },
        { reg: /Database username/ , write: 'travis\n'   , done: false },
        { reg: /Database password/ , write: '\n'         , done: false },
        { reg: /Database name/     , write: 'test_db\n'  , done: false },
        { reg: /Database dialect/  , write: 'mysql\n'    , done: false },
        { reg: /Database host/     , write: '127.0.0.1\n', done: false },
        { reg: /Database port/     , write: '3306\n'     , done: false }
      ]
      , proc = spawn ('clever', [ 'install', 'clever-orm' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - install clever-orm module - begin');

    proc.stdout.on('data', function (data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }

      objs.forEach (function (obj, i) {
        if (obj.done !== true && str.match(obj.reg) !== null) {
          objs[i].done = true;
          proc.stdin.write(obj.write);
        }
      });
    });

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code);
      resolve();
    });
  });
}

function installAuthModule() {
  step++;
  return new Promise(function(resolve, reject) {
    var objs = [
        { reg: /Overwrite existing user with the same username\?/, write: '\n', done: false },
        { reg: /What environment is this configuration for\?/, write: '\n', done: false },
        { reg: /Secret key used to secure your passport sessions/, write: '\n', done: false },
        { reg: /What database driver module to use\: \(Use arrow keys\)/, write: '\n', done: false },
        { reg: /Session Storage Driver\: \(Use arrow keys\)/, write: '\n', done: false },
        { reg: /Redis host\: \(localhost\)/, write: '\n', done: false },
        { reg: /Redis port\: \(6379\)/, write: '\n', done: false },
        { reg: /Redis prefix\:/, write: '\n', done: false },
        { reg: /Redis key\:/, write: '\n', done: false }
      ]
      , proc = spawn('grunt', [ 'prompt:cleverAuthConfig' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - install clever-auth module - begin\n');

    proc.stdout.on('data', function (data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }

      objs.forEach (function (obj, i) {
        if (obj.done !== true && str.match(obj.reg) !== null) {
          objs[i].done = true;
          proc.stdin.write(obj.write);
        }
      });
    });

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code + '\n');
      resolve();
    });
  });
}

function copyAuthModule() {
  return new Promise(function(resolve, reject) {
    var fromDir     = path.join(__dirname, '../')
      , toDir       = path.join(__dirname, 'assets', prName, 'modules', 'clever-auth');

    console.log('step #' + step + ' - copy clever-auth module in test project - begin\n');

    function copyDir(from, to) {
      var files = fs.readdirSync(from);

      if (!fs.existsSync(to)) {
        fs.mkdir(to, function (err) {
          if (err) {
            console.log('error - ' + err);
          }
        });
      }

      files.forEach (function (file) {
        
        fs.stat(path.join(from, file), function (err, stats) {
          
          if (err) {
            console.log('Error in step #' + step + ' - ' + err + '\n');
            reject (err);
          }

          if (stats && stats.isFile()) {
            copyFile (path.join(from, file), path.join(to, file));
          }

          if (stats && stats.isDirectory() && file !== prName) {
            ncp(path.join(from, file), path.join(to, file), function (err) {
              if (err) {
                console.log('Error in step #' + step + ' - ' + err + '\n');
                reject (err);
              }
            });
          }
        });
      });
    }

    function copyFile (from, to) {
      var rs = fs.createReadStream(from)
        , ws = fs.createWriteStream(to);
      
      rs.on('error', function(err) {
        console.log(err);
      });

      ws.on('error', function(err) {
        console.log(err);
      });
        
      rs.pipe(ws);
    }

    copyDir(fromDir, toDir);

    console.log('step #' + step + ' - completed');
    resolve();
  });
}

function installAccountsModule() {
  step++;
  return new Promise(function(resolve, reject) {
    var objs = []
      , proc = spawn('clever', [ 'install', 'clever-accounts' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - install clever-accounts module - begin\n');

    proc.stdout.on('data', function (data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }

      objs.forEach (function (obj, i) {
        if (obj.done !== true && str.match(obj.reg) !== null) {
          objs[i].done = true;
          proc.stdin.write(obj.write);
        }
      });
    });

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code + '\n');
      resolve();
    });
  });
}

function installRolesModule() {
  step++;
  return new Promise(function(resolve, reject) {
    var objs = []
      , proc = spawn('clever', [ 'install', 'clever-roles' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - install clever-roles module - begin\n');

    proc.stdout.on('data', function(data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }

      objs.forEach (function (obj, i) {
        if (obj.done !== true && str.match(obj.reg) !== null) {
          objs[i].done = true;
          proc.stdin.write(obj.write);
        }
      });
    });

    proc.stderr.on('data', function(data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function(code) {
      console.log('step #' + step + ' process exited with code ' + code + '\n');
      resolve();
    });
  });
}

function installUsersModule() {
  step++;
  return new Promise(function(resolve, reject) {
    var objs = [
        { reg: /Default Username\: \(default\)/, write: '\n', done: false },
        { reg: /Default Users Password\: /, write: '\n', done: false },
        { reg: /Overwrite existing user with the same username\? \(Y\/n\)/, write: '\n', done: false },
        { reg: /Default Users Email\: \(default@cleverstack.io\)/, write: '\n', done: false },
        { reg: /Default Users Firstname\: \(Clever\)/, write: '\n', done: false },
        { reg: /Default Users Lastname\: \(User\)/, write: '\n', done: false },
        { reg: /Default Users Phone Number\:/, write: '\n', done: false },
        { reg: /Default User has admin rights\: \(Y\/n\)/, write: '\n', done: false },
        { reg: /Default User has confirmed their email\: \(Y\/n\)/, write: '\n', done: false },
        { reg: /Default User has an active account\: \(Y\/n\)/, write: '\n', done: false }
      ]
      , proc = spawn('clever', [ 'install', 'clever-users' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - install clever-users module - begin\n');

    proc.stdout.on('data', function (data) {
      var str = data.toString();

      if (str.match(/ing/) !== null) {
        console.log(str);
      }

      objs.forEach (function (obj, i) {
        if (obj.done !== true && str.match(obj.reg) !== null) {
          objs[i].done = true;
          proc.stdin.write(obj.write);
        }
      });
    });

    proc.stderr.on('data', function (data) {
      console.log('Error in step #' + step + ' - ' + data.toString() + '\n');
      reject (data.toString());
    });

    proc.on('close', function (code) {
      console.log('step #' + step + ' process exited with code ' + code + '\n');
      resolve();
    });
  });
}

function rebaseDb() {
  step++;
  return new Promise(function(resolve, reject) {
    var proc = spawn('grunt', [ 'db' ], { cwd: path.join(__dirname, 'assets', prName) });

    console.log('step #' + step + ' - rebase db');

    proc.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    proc.stderr.on('data', function(data) {
      console.log('Error in step #' + step + ' - ' + data.toString());
      reject(data.toString());
    });

    proc.on('close', function(code) {
      console.log('step #' + step + ' process exited with code ' + code);
      resolve();
    });
  });
}

createProject()
  .then(installORM)
  .then(installTestModule)
  .then(copyAuthModule)
  .then(installAuthModule)
  .then(installAccountsModule)
  .then(installRolesModule)
  .then(installUsersModule)
  .then(cleverSetup)
  .then(rebaseDb)
  .then(function() {
    console.log('Success.');
    process.exit(0);
  })
  .catch (function (err) {
    console.error('Error - ' + err);
  });
