const Sequelize = require('sequelize')
const DataTypes = require('sequelize/lib/data-types')
const Fs = require('fs')
const Path = require('path')
const Hapi = require('hapi')
const Hoek = require('hoek')
const Inert = require('inert')
const Vision = require('vision')
const Nes = require('nes')

const logger = require('./logger')
const { getScheduler } = require('./scheduler')
const { setViewEngine } = require('./view')
const defaultOptions = require('./default-options')

const server = new Hapi.Server()

const models = []
const modules = {
  list: [],
  files: [],
  push: (item) => {
    modules.files.push(item)
  },
  install: () => {
    modules.files.forEach(it => require(it))
  },
}

const getSequelizeInstance = (config) => {
  let sequelize
  if (config.useSequelize) {
    if (!config.database.url) {
      config.database.url = ''
    }
    if (!config.database) {
      logger.error('options.database { url: string, options: object } is not exists.')
      process.exit(1)
    }
    let url = ''
    let options = {}
    if (!config.database.url) {
      options = config.database
    } else {
      url = config.database.url
      options = config.database.options
    }
    if (options.dialect) require(`./database/${options.dialect}`)
    if (typeof options.logging === 'undefined') options.logging = logger.info
    if (url) {
      sequelize = new Sequelize(url, options)
    } else {
      sequelize = new Sequelize(options)
    }
  }
  return sequelize
}

server.init = (options) => {
  const config = Hoek.applyToDefaults(defaultOptions, options)
  server.config = config

  // server cache for session
  if (config.yar.engine.type === 'redis') {
    server.cache.provision({
      engine: require('catbox-redis'),
      name: 'session',
      url: config.redis.url,
    })
  } else {
    server.cache.provision({
      engine: require('catbox-disk'),
      name: 'session',
      cachePath: config.yar.engine.cachePath,
    })
  }

  // scheduler
  server.scheduler = config.scheduler.enable ? getScheduler(config) : null

  // model
  server.sequelize = getSequelizeInstance(config)
  server.DataTypes = DataTypes

  // modules
  const callerDir = Path.dirname(module.parent.filename)
  const allFiles = config.moduleFilenames.concat(config.modelFilenames)

  modules.list = config.modules.map(m => Path.join(callerDir, m))
  config.modules.forEach((m) => {
    allFiles.forEach((mod) => {
      const moduleName = Path.join(callerDir, m, mod)
      const moduleFile = `${moduleName}.js`
      try {
        Fs.statSync(moduleFile)
      } catch (e) {
        return
      }
      try {
        if (mod === 'model' && config.useSequelize) {
          try {
            const importedModels = require(moduleFile)
            Object.keys(importedModels).forEach((it) => { models[it] = importedModels[it] })
          } catch (e) {
            logger.error(e, e.stack)
            process.exit(-1)
          }
        } else {
          modules.push(moduleName)
        }
      } catch (e) {
        console.error(e)
      }
    })
  })

  // intiialize models
  if (config.useSequelize) {
    Object.keys(models).forEach((modelName) => {
      if ('associate' in models[modelName]) models[modelName].associate(models)
    })
  }

  // remap swagger version
  config.swagger.info.version = config.version

  return new Promise((resolve, reject) => {
    server.connection(config.connection)

    // yar optinos
    config.yar.storeBlank = false
    config.yar.maxCookieSize = 0 // use server side storage
    config.yar.cache = {
      cache: 'session',
    }

    const plugins = [
      Inert,
      Vision,
      {
        register: require('yar'),
        options: config.yar,
      },
      {
        register: require('hapi-es7-async-handler'),
        options: {
          server,
        },
      },
      {
        register: require('hapi-swagger'),
        options: config.swagger,
      },
      Nes,
      ...(config.plugins || []),
    ]

    server.register(plugins, (err) => {
      if (err) {
        reject(err)
        return
      }

      // view
      setViewEngine(server, config, modules.list)

      // auth
      try {
        if (config.auths) {
          config.auths.forEach((auth) => {
            server.auth.scheme(auth[0], auth[1])
            server.auth.strategy(auth[0], auth[0], {
              validateFunc: () => { },
            })
          })
        }
      } catch (e) {
        logger.error(e, e.stack)
      }

      modules.install()
      resolve(() => server.start())
    })
  })
}

module.exports = {
  server,
  models,
  logger,
}
