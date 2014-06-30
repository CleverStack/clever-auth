CleverStack Authentication Module
====================
[![NPM version](https://badge.fury.io/js/clever-auth.png)](http://badge.fury.io/js/clever-auth) [![GitHub version](https://badge.fury.io/gh/cleverstack%2Fclever-auth.png)](http://badge.fury.io/gh/cleverstack%2Fclever-auth) [![Dependency Status](https://david-dm.org/CleverStack/clever-auth.png)](https://david-dm.org/CleverStack/clever-auth) [![devDependency Status](https://david-dm.org/CleverStack/clever-auth/dev-status.png)](https://david-dm.org/CleverStack/clever-auth#info=devDependencies) [![Code Climate](https://codeclimate.com/github/CleverStack/clever-auth.png)](https://codeclimate.com/github/CleverStack/clever-auth) [![Build Status](https://secure.travis-ci.org/CleverStack/clever-auth.png?branch=master)](https://travis-ci.org/CleverStack/clever-auth) [![Coverage](https://codeclimate.com/github/CleverStack/clever-auth/coverage.png)](https://codeclimate.com/github/CleverStack/clever-auth) [![NPM downloads](http://img.shields.io/npm/dm/clever-auth.png)](https://www.npmjs.org/package/clever-auth) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/) 

![CleverStack NodeJS Authentication Module](http://cleverstack.github.io/assets/img/logos/node-seed-logo-clean.png "CleverStack NodeJS Authentication Module")
<blockquote>
This CleverStack Module provides users & authentication for the node-seed, it works with either the Object Relational Mapper (clever-orm) AND the Object Document Mapper (clever-odm) Module's.

Out of the box you can use this module with MongoDB, MySQL, MariaDB, PostgreSQL or SQLite! And because this module uses Redis for session storage it's also scalable.
</blockquote>

## Documentation

See [cleverstack.io](http://cleverstack.io/documentation/#backend) for more detailed information on the Node seed or visit the [Getting Started Guide](http://cleverstack.io/getting-started/)

## Configuration
You can use this module with either the clever-orm (ORM) or clever-odm (ODM) modules, simply add the following config to your /config/local.json (or into your global.json for all environments, or in whatever environment you are using).

### Grunt
1. `grunt prompt:cleverAuthConfig` can be used to generate your config for any environment you want
2. `grunt prompt:cleverAuthSeed` can be used to add/edit users inside your seed data

### Configuration files

```
// For ODM
"clever-auth": {
  	"driver": "ODM"
}

// For ORM
"clever-auth": {
  	"driver": "ORM"
}

// Using In-Memory Session Storage
"clever-auth": {
  	"sessionStoreDriver": "in-memory"
}

// Using Redis for Session Storage
"clever-auth": {
  	"sessionStoreDriver": "redis",
    "redis": {
        "host": "localhost",
        "port": "6379",
        "prefix": "",
        "key": ""
    }
}

// Using Memcache for Session Storage
"clever-auth": {
  	"sessionStoreDriver": "redis",
    "memcache": {
        "host": "localhost",
        "port": "11211",
        "prefix": ""
    }
}
```

## Setup

### Using CLI
1. Run `clever install clever-auth` and follow the prompts
2. Run `clever serve` to start your application.

### Without CLI
1. Clone this repo (or untar it there) into your modules folder (ie modules/clever-auth)
2. Add 'clever-auth' to the bundledDependencies array of your app's package.json.
3. Run `grunt prompt:cleverAuthConfig` and fill in your configuration options.
4. Run `grunt prompt:cleverAuthSeed` and create your default user.
5. Run `grunt db` to rebase and seed the data.
6. Run `grunt server` to start your application.

## Rebuilding (rebasing) and Seeding your database
1. `grunt db:rebaseOrm` will rebase your ORM database (delete and completely replace all tables)
2. `grunt db:seedOrm` will seed data into your ORM database
3. `grunt db:orm` will perform both of the above tasks

Note: You can just run `grunt db`, `grunt db:rebase` and `grunt db:seed` but if the ODM module is installed it will perform these operations on that DB as well (which might be exactly what your looking for)

## Test Account Credentials

username: `test@cleverstack.io` <br>
password: `clever`

## License

See our [LICENSE](https://github.com/CleverStack/clever-auth/blob/master/LICENSE)