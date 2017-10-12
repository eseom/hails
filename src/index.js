/* eslint-disable import/no-dynamic-require */

import Fs from 'fs'
import Path from 'path'
import Hoek from 'hoek'
import Hapi from 'hapi'
import Vision from 'vision'
import Inert from 'inert'
import Blipp from 'blipp'
import Nes from 'nes'

import getScheduler from './scheduler'
import defaultOptions from './default-options'
import { initLogger, systemLogger } from './logger'
import { getSequelizeInstance, getSequelizeDataTypes } from './sequelize'
import { setViewEngine } from './view'


export class Server extends Hapi.Server {
  getElementsToInject() {
    return {
      models: this.modules.models,
      server: this,
      scheduler: this.scheduler || {
        now: () => {
          this.logger.error('scheduler.now() called: config.scheduler.enable == false')
        },
      },
      logger: this.logger,
    }
  }

  constructor() {
    super()
    /**
     * hails configuration
     */
    this.config = {}
    this.scheduler = undefined
    this.sequelize = undefined
    this.DataTypes = undefined
    this.logger = undefined

    /**
     * divided modules container
     */
    this.modules = {
      list: [],
      models: [],
      tasks: [],
      apis: [],
      methods: [],
      install: () => {
        this.modules.methods.forEach((methodsFile) => {
          const methods = require(methodsFile).default(this.getElementsToInject())
          methods.forEach(m => this.method(m))
        })
        this.modules.apis.forEach((apisFile) => {
          const apis = require(apisFile).default(this.getElementsToInject())
          apis.forEach(a => this.route(a))
        })
        this.modules.tasks.forEach((tasksFile) => {
          const tasks = require(tasksFile).default(this.getElementsToInject())
          tasks.forEach(t => this.scheduler.register(t.name, t.handler))
          // tasks.forEach(a => this.route(a))
        })
      },
    }
  }

  init() {
    const settingsFile = Path.resolve(process.cwd(), 'settings.js')
    const options = require(settingsFile)[
      process.env.NODE_ENV || 'development']

    systemLogger.info('options initializing...')
    const config = Hoek.applyToDefaults(defaultOptions, options)
    this.config = config

    // logger
    this.logger = initLogger(config.logger || {})

    // server cache for session
    let catboxConfig
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
    this.scheduler = config.scheduler.enable ? getScheduler(config, this.logger) : undefined

    // model
    if (config.useSequelize) {
      this.sequelize = getSequelizeInstance(systemLogger, config)
      this.DataTypes = getSequelizeDataTypes()
    }

    // modules
    // const callerDir = Path.dirname(module.parent.filename)
    const allFiles = config.moduleFilenames.concat(config.modelFilenames)

    this.modules.list = config.modules.map(m => Path.join(config.context, m))
    config.modules.forEach((m) => {
      allFiles.forEach((mod) => {
        const moduleName = Path.join(Path.resolve(config.context), m, mod)
        try {
          Fs.statSync(`${moduleName}.js`)
        } catch (e) {
          return
        }
        try {
          switch (mod) {
            case 'model':
              if (config.useSequelize) {
                try {
                  const importedModels = require(moduleName).default
                  importedModels(this.DataTypes).forEach((model) => {
                    this.modules.models[model.model] =
                      this.sequelize.define(model.table, model.options)
                  })
                } catch (e) {
                  systemLogger.error(e, e.stack)
                  process.exit(-1)
                }
              }
              break
            case 'method':
              this.modules.methods.push(moduleName)
              break
            case 'view':
            case 'api':
              this.modules.apis.push(moduleName)
              break
            case 'task':
              if (this.scheduler) this.modules.tasks.push(moduleName)
              break
            default:
              break
          }
        } catch (e) {
          this.logger.error(e)
        }
      })
    })

    // intiialize models
    if (config.useSequelize) {
      Object.keys(this.modules.models).forEach((modelName) => {
        if (this.modules.models[modelName].associate) {
          this.modules.models[modelName].associate(this.modules.models)
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
          register: require('hapi-es7-async-handler'),
        },
        {
          register: require('yar'),
          options: config.yar,
        },
        {
          register: require('hapi-swagger'),
          options: config.swagger,
        },
        Blipp,
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
