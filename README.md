## hails

hapi based web stack with sequelize, kuejs, etc.

- from 0.4.0, added supports for hapi17

[![npm version][npm-badge]][npm-url]

## get started

```bash
mkdir my-project
cd $_
yarn add hails
mkdir -p src/core

# settings.js
echo "module.exports = {
  development: {
    context: './src',
    modules: [
      'core',
    ],
  },
}" > settings.js

# src/core/api.js
echo "export default () => [{
  method: 'GET',
  path: '/',
  handler(request) {
    return 'hello world'
  },
}]" > src/core/api.js

# that's all, run a server.
yarn hails run
# open http://localhost:3000
```

## sample code
```
git clone https://github.com/eseom/hails-sample <project name>
cd <project name>
yarn
yarn dev
```

## feature
* essential hapi plugins 
* module system like django
* sequelize integrated
* kue integrated

## default options

```
export default {
  context: undefined,
  vesion: undefined,
  server: {
    host: 'localhost',
    port: 3000,
  },
  logger: {
    level: 'silly',
  },
  modules: [],
  useSequelize: false,
  viewEngine: {
    type: 'nunjucks',
  },
  scheduler: {
    enable: false,
  },
  swagger: {
    info: {
      title: 'API Documentation',
    },
    grouping: 'tags',
  },
  yar: {
    engine: {
      type: 'memory',
    },
    cookieOptions: {
      password: 'the-password-must-be-at-least-32-characters-long',
      isSecure: false,
    },
  },
}
```

## development
```
yarn
yarn watch
```

## api
* (TODO)

[npm-url]: https://www.npmjs.com/package/hails
[npm-badge]: https://img.shields.io/npm/v/hails.svg
