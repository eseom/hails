import * as Fs from 'fs'
import * as Path from 'path'
import * as Hapi from 'hapi'
import * as Hoek from 'hoek'
import * as Inert from 'inert'
import * as Vision from 'vision'
import * as Nes from 'nes'
import * as winston from 'winston'

import { initLogger, instance } from './logger'

import getScheduler from './scheduler'
import { setViewEngine } from './view'
import defaultOptions from './default-options'
import { getSequelizeInstance } from './sequelize'

import { IServer, Configuration } from './types'

export interface Models {
  [key: string]: any
}

const server: IServer = new Hapi.Server()
const models: Models = {} // ObjectArray<Sequelize.Instance<string>> = []

const systemLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      label: "system",
    }),
  ],
})

export type ModulesContainer = {
  list: Array<string>
  files: Array<string>
  push: (item: string) => void
  install: () => void
}

const modules: ModulesContainer = {
  list: [],
  files: [],
  push: (item) => {
    modules.files.push(item)
  },
  install: () => {
    modules.files.forEach(it => require(it))
  },
}

/**
 * init
 */
server.init = (options: Configuration) => {
  systemLogger.info('options initializing...')
  const config = Hoek.applyToDefaults(defaultOptions, options)
  server.config = config

  // logger
  initLogger(config.logger || {})

  // server cache for session
  let catboxConfig: Hapi.CatboxServerCacheConfiguration
  if (config.yar.engine.type === 'redis') {
    catboxConfig = {
      engine: require('catbox-redis'),
      name: 'session',
      url: config.redis.url,
    }
  } else {
    catboxConfig = {
      engine: require('catbox-disk'),
      name: 'session',
      cachePath: config.yar.engine.cachePath,
    }
  }
  server.cache.provision(catboxConfig)

  // scheduler
  server.scheduler = config.scheduler.enable ? getScheduler(config) : null

  // model
  server.sequelize = getSequelizeInstance(systemLogger, config)
  // server.DataTypes = SequelizeStatic.DataTypes

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
            Object.keys(importedModels).forEach((key: string) => { models[key] = importedModels[key] })
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
    Object.keys(models).forEach((modelName: string) => {
      if (models[modelName].associate) {
        models[modelName].associate(models)
      }
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
  instance as logger,
  server,
  models,
}
