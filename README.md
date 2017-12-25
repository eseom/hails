# hails

hapi based web stack with sequelize, kuejs, etc.

- from 0.4.0, added supports for hapi17

# get started

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
  handler(request, reply) {
    reply('hello world')
  },
}]" > src/core/api.js

# that's all, run a server.
yarn hails run
# open http://localhost:3000
```

# sample code
```
git clone https://github.com/eseom/hails-sample <project name>
cd <project name>
yarn
yarn dev
```

# feature
* essential hapi plugins 
* module system like django
* sequelize integrated

# default options

```
{
  vesion: undefined,
  connection: {
   host: '0.0.0.0',
	port: 3000,
  },
  logger: {
    level: 'silly',
  },
  modules: [],
  moduleFilenames: ['api', 'app', 'method', 'view', 'task'],
  modelFilenames: ['model'],
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
  }
}
```

# api
* (TODO)
