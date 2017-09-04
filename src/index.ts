import * as Sequelize from 'sequelize'
import * as Fs from 'fs'
import * as Path from 'path'
import * as Hapi from 'hapi'
import * as Hoek from 'hoek'
import * as Inert from 'inert'
import * as Vision from 'vision'
import * as Nes from 'nes'

import { logger } from './logger'
import { getScheduler } from './scheduler'
import { setViewEngine } from './view'
import * as defaultOptions from './default-options'

import { IServer, Configuration } from './types'

export const server: IServer = new Hapi.Server()
export const models = []
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
    let options: Sequelize.Options
    if (!config.database.url) {
      options = config.database
    } else {
      url = config.database.url
      options = config.database.options
    }
    if (options.dialect) { require(`./database/${options.dialect}`) }
    if (typeof options.logging === 'undefined') { options.logging = logger.info }
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
  const config = Hoek.applyToDefaults(defaultOptions, options)
  server.config = config

  // register catbox redis
  // const cacheOptions: Hapi.CatboxServerCacheConfiguration = {
  const cacheOptions = {
    engine: require('catbox-redis'),
    name: 'session',
    url: config.redis.url,
  }

  server.cache.provision(cacheOptions)

  // scheduler
  server.scheduler = getScheduler(config)

  // model
  server.sequelize = getSequelizeInstance(config)

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
          const importedModels = server.sequelize.import(moduleFile)
          Object.keys(importedModels).forEach((it) => {
            models[it] = importedModels[it]
          })
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
    server.connection({
      port: config.port,
    })

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

export {
  logger,
}
