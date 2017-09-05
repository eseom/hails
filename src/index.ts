import * as Sequelize from 'sequelize'
import * as Fs from 'fs'
import * as Path from 'path'
import * as Hapi from 'hapi'
import * as Hoek from 'hoek'
import * as Inert from 'inert'
import * as Vision from 'vision'
import * as Nes from 'nes'
import * as winston from 'winston'

import * as logger from './logger'

import { getScheduler } from './scheduler'
import { setViewEngine } from './view'
import * as defaultOptions from './default-options'

import { IServer, Configuration } from './types'

const server: IServer = new Hapi.Server()
const models = []

const systemLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      label: "system",
    }),
  ],
})

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
      systemLogger.error('options.database { url: string, options: object } is not exists.')
      process.exit(1)
    }
    let url = ''
    let options: Sequelize.Options
    if (!config.database.url) {
      options = config.database
    } else {
      url = config.database.url
      options = config.database.options
    }
    if (options.dialect) { require(`./database/${options.dialect}`) }
    if (typeof options.logging === 'undefined') { options.logging = systemLogger.info }
    if (url) {
      sequelize = new Sequelize(url, options)
    } else {
      sequelize = new Sequelize(undefined, options)
    }
  }
  return sequelize
}

/**
 * init
 */
server.init = (options: Configuration) => {
  systemLogger.info('options initializing...')
  const config = Hoek.applyToDefaults(defaultOptions, options)
  server.config = config

  // logger
  logger.initLogger(config.logger || {})

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
            systemLogger.error(e, e.stack)
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
      if ('associate' in models[modelName]) { models[modelName].associate(models) }
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
        systemLogger.error(e, e.stack)
      }

      modules.install()
      resolve(() => server.start())
    })
  })
}

export {
  logger: logger.instance,
  server,
  models,
}
