CleverStack Authentication Module
====================
[![NPM version](https://badge.fury.io/js/clever-auth.png)](http://badge.fury.io/js/clever-auth) [![GitHub version](https://badge.fury.io/gh/cleverstack%2Fclever-auth.png)](http://badge.fury.io/gh/cleverstack%2Fclever-auth) [![Dependency Status](https://david-dm.org/CleverStack/clever-auth.png)](https://david-dm.org/CleverStack/clever-auth) [![devDependency Status](https://david-dm.org/CleverStack/clever-auth/dev-status.png)](https://david-dm.org/CleverStack/clever-auth#info=devDependencies) [![Code Climate](https://codeclimate.com/github/CleverStack/clever-auth.png)](https://codeclimate.com/github/CleverStack/clever-auth) [![Build Status](https://secure.travis-ci.org/CleverStack/clever-auth.png?branch=master)](https://travis-ci.org/CleverStack/clever-auth) [![Coverage](https://codeclimate.com/github/CleverStack/clever-auth/coverage.png)](https://codeclimate.com/github/CleverStack/clever-auth) [![NPM downloads](http://img.shields.io/npm/dm/clever-auth.png)](https://www.npmjs.org/package/clever-auth) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)  [![Join the chat at https://gitter.im/CleverStack/cleverstack-cli](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/CleverStack/cleverstack-cli?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![CleverStack NodeJS Authentication Module](http://cleverstack.github.io/assets/img/logos/node-seed-logo-clean.png "CleverStack NodeJS Authentication Module")
<blockquote>
This CleverStack Module provides easy to use,  easy to configure, reliable and scalable Authentication System that allows you to (within minutes) have authentication via Google, Facebook, Github, LinkedIn, and many more...
</blockquote>

## Highlights
* Works with both the `clever-orm` and the `clever-odm` modules.
* Easy to use configuration prompts, `grunt prompt:cleverAuthConfig`.
* Easily installed using the CleverStack CLI, `clever install clever-auth`.
* Easily extend `clever-auth` with new Authentication Providers that are not implemented yet.
* Use with the `clever-users` module - OR - with any other module that exports the `UserController`, `UserService` and `UserModel` resources/classes.
* Authentication Strategies: Github, LinkedIn, Facebook, Twitter, Dropbox, Google - as well as local authentication out of the box.


## Prerequisites
  1. You must be using [cleverstack-cli](https://github.com/CleverStack/cleverstack-cli) version [1.2.2](https://github.com/CleverStack/cleverstack-cli/releases/tag/1.2.2) or newer.
  2. Your project must be using [node-seed](https://github.com/CleverStack/node-seed) version [1.2.1](https://github.com/CleverStack/node-seed/releases/tag/1.2.1) or newer.
  3. You must either install the [clever-users](https://github.com/CleverStack/clever-users) module, or any other module that provides the `UserController`, `UserService` and `UserModel` resources/classes.


## Installation

### Using CLI
1. Run `clever install clever-auth` and follow the prompts
2. Run `clever serve` to start your application.

### Without CLI
1. Clone this repo (or untar it there) into your modules folder (ie `modules/clever-auth`)
3. Run `grunt prompt:cleverAuthConfig` and fill in your configuration options.
5. Run `grunt db` to rebase and seed the data.
6. Run `grunt server` to start your application.



## Configuration

### Files
For more information about how modules (including clever-auth) are configured, please see the [cleverstack.io](http://cleverstack.io/documentation/backend) Documentation sections, [Backend Configuration](http://localhost:9001/documentation/backend/#configuration) and [Module Configuration](http://localhost:9001/documentation/backend/modules/#configuration) for more information.

### Grunt prompts
1. `grunt prompt:cleverAuthConfig` can be used to generate your config for any environment you want.

### Options
#### `store` - Session Store Driver

##### `in-memory` - Using the In-Memory Session Store.
```
{
  "clever-auth": {
  "store"    : "in-memory"
  }
}
```

##### `redis` - Using Redis to Store Sessions. (implemented using `connect-redis`)
```
{
  "clever-auth": {
  "store"    : "redis",
  "redis": {
      "key"    : "",
      "port"   : "6379",
      "host"   : "localhost",
      "prefix" : ""
    }
  }
}
```

##### `memcache` - Using Memcache to Store Sessions. (implemented using `connect-memcached`)
```
{
  "clever-auth": {
  "store"    : "memcache",
    "memcache": {
      "host"   : "localhost",
      "port"   : "11211",
      "prefix" : ""
    }
  }
}
```

#### `secretKey` - extra salt to be used to help secure any cookies.
```
{
  "clever-auth": {
    "secretKey": "",
  }
}
```

## Documentation

See [cleverstack.io](http://cleverstack.io/documentation/#backend) for more detailed information on the Node Seed or visit the [Getting Started Guide](http://cleverstack.io/getting-started/) if you have never used CleverStack before.

## License

See our [LICENSE](https://github.com/CleverStack/clever-auth/blob/master/LICENSE)
