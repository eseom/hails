import * as Fs from 'fs'
import * as Path from 'path'
import * as Hoek from 'hoek'
import * as Hapi from 'hapi'
import * as Vision from 'vision'
import * as Inert from 'inert'
import * as Nes from 'nes'
import * as SequelizeStatic from 'sequelize'

import getScheduler from './scheduler'
import defaultOptions from './default-options'
import { DataTypes } from 'sequelize'
import { ModulesContainer, IServer, Scheduler, Configuration } from './types'
import { initLogger, instance, systemLogger } from './logger'
import { getSequelizeInstance, getSequelizeDataTypes } from './sequelize'
import { setViewEngine } from './view'

// TODO bad situation
let models: {
  // TODO explicit any
  [key: string]: any
} = {}


export class Server extends Hapi.Server implements IServer {

  /**
   * hails configuration
   */
  // private models: any

  config: Object
  scheduler: Scheduler
  sequelize: SequelizeStatic.Sequelize
  DataTypes: SequelizeStatic.DataTypes

  /**
   * divided modules container
   */
  private modules: ModulesContainer = {
    list: [],
    files: [],
    push: (item) => {
      this.modules.files.push(item)
    },
    install: () => {
      this.modules.files.forEach(it => require(it))
    },
  }

  public init(options: Configuration) {
    systemLogger.info('options initializing...')
    const config = Hoek.applyToDefaults(defaultOptions, options)
    this.config = config

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
    this.cache.provision(catboxConfig)

    // scheduler
    this.scheduler = config.scheduler.enable ? getScheduler(config) : null

    // model
    if (config.useSequelize) {
      this.sequelize = getSequelizeInstance(systemLogger, config)
      this.DataTypes = getSequelizeDataTypes()
    }
    // this.DataTypes = SequelizeStatic.DataTypes

    // modules
    const callerDir = Path.dirname(module.parent.filename)
    const allFiles = config.moduleFilenames.concat(config.modelFilenames)

    this.modules.list = config.modules.map(m => Path.join(callerDir, m))
    config.modules.forEach((m) => {
      allFiles.forEach((mod) => {
        const moduleName = Path.join(callerDir, m, mod)
        const moduleFile = `${moduleName}`
        try {
          Fs.statSync(`${moduleFile}.js`)
        } catch (e) {
          try {
            Fs.statSync(`${moduleFile}.ts`)
          } catch (e) {
            return
          }
        }
        try {
          if (mod === 'model') {
            if (config.useSequelize) {
              try {
                models = { ...models, ...(require(moduleFile)) }
              } catch (e) {
                systemLogger.error(e, e.stack)
                process.exit(-1)
              }
            }
          } else {
            this.modules.push(moduleName)
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
      this.connection(config.connection)

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
            server: this,
          },
        },
        {
          register: require('hapi-swagger'),
          options: config.swagger,
        },
        Nes,
        ...(config.plugins || []),
      ]

      this.register(plugins, (err) => {
        if (err) {
          reject(err)
          return
        }

        // view
        setViewEngine(this, config, this.modules.list)

        // auth
        try {
          if (config.auths) {
            config.auths.forEach((auth) => {
              this.auth.scheme(auth[0], auth[1])
              this.auth.strategy(auth[0], auth[0], {
                validateFunc: () => { },
              })
            })
          }
        } catch (e) {
          systemLogger.error(e, e.stack)
        }

        this.modules.install()
        resolve(() => {
          this.start()
        })
      })
    })

  }
}

export const server = new Server()
export {
  instance as logger,
  models,
}