/* eslint-disable import/no-dynamic-require */

import Path from 'path'
import Hapi from 'hapi'
import Hoek from 'hoek'
import Fs from 'fs'
import Vision from 'vision'
import Nes from 'nes'
import Blipp from 'blipp'
import Inert from 'inert'

import initializeLogger from './logger'
import defaultOptions from './default-options'
import getScheduler from './scheduler'
import { getSequelizeInstance, getSequelizeDataTypes } from './sequelize'
import { setViewEngine } from './view'

export default class {
  stop() {
    return this.hapiServer.stop()
  }
  async init({ cli = false }) {
    // settings
    const settings = require(Path.resolve(process.cwd(), 'settings.js'))[process.env.NODE_ENV || 'development']

    // config
    const config = Hoek.applyToDefaults(defaultOptions, settings)

    // don't init the scheduler on cli mode
    config.scheduler.enable = cli ? false : config.scheduler.enable

    this.config = config

    // initialize logger
    const logger = initializeLogger(config.logger)
    this.logger = logger
    logger.info('applying configs from settings.js...')

    // cli interface
    this.cliInterface = {}

    // hapi server
    this.hapiServer = Hapi.server({
      port: config.connection.port,

      // server cache for session
      cache: (() => {
        if (config.yar.engine.type === 'redis') {
          return {
            engine: require('catbox-redis'),
            name: 'session',
            url: config.redis.url,
          }
        }
        return {
          engine: require('catbox-memory'),
          name: 'session',
        }
      })(),
    })

    // scheduler
    this.scheduler = config.scheduler.enable ? getScheduler(config, this.logger) : undefined

    // models
    if (config.useSequelize) {
      this.sequelize = getSequelizeInstance(logger, config)
      this.DataTypes = getSequelizeDataTypes()
    }

    // modules
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
                const importedModels = require(moduleName).default
                importedModels(this.DataTypes, this).forEach((mf) => {
                  this.modules.models[mf.model] =
                    this.sequelize.define(mf.table, mf.fields, mf.options || {})

                  // for sequelize 4
                  // instance methods
                  const im = mf.options && mf.options.instanceMethods
                  const cm = mf.options && mf.options.classMethods
                  if (im) {
                    Object.keys(im).forEach((key) => {
                      this.modules.models[mf.model].prototype[key] = im[key]
                    })
                  }
                  // class methods
                  if (cm) {
                    Object.keys(cm).forEach((key) => {
                      this.modules.models[mf.model][key] = cm[key]
                    })
                  }
                })
              }
              break
            case 'method':
              this.modules.methods.push(moduleName)
              break
            case 'view':
            case 'api':
              this.modules.apis.push(moduleName)
              break
            case 'app':
              this.modules.apps.push(moduleName)
              break
            case 'task':
              if (this.scheduler) this.modules.tasks.push(moduleName)
              break
            case 'command':
              this.modules.commands.push(moduleName)
              break
            default:
              break
          }
        } catch (e) {
          this.logger.error('%s %j', e.toString(), e.stack)
          process.exit(-1)
        }
      })
    })

    // intiialize models
    if (config.useSequelize) {
      Object.keys(this.modules.models).forEach((modelName) => {
        if (this.modules.models[modelName].initialize) {
          this.modules.models[modelName].initialize(this.modules.models)
        }
      })
    }

    // rewrite swagger version
    config.swagger.info.version = config.version

    // include auth
    const auths = (() => {
      try {
        const authImported = require(Path.join(Path.resolve(config.context), 'auth.js')).default
        return authImported(this.getElementsToInject())
      } catch (e) {
        return []
      }
    })()

    // include plugins
    const plugins = [
      Inert,
      Vision,
      {
        plugin: require('yar'),
        options: config.yar,
      },
      {
        plugin: require('hapi-swagger'),
        options: config.swagger,
      },
      Blipp,
      Nes,
      ...((() => {
        try {
          return require(Path.join(Path.resolve(config.context), 'plugin.js')).default
        } catch (e) {
          return []
        }
      })()),
    ]

    // auth
    try {
      if (auths) {
        auths.forEach((auth) => {
          this.hapiServer.auth.scheme(auth[0], auth[1])
          this.hapiServer.auth.strategy(auth[0], auth[0])
        })
      }
    } catch (e) {
      logger.error(e, e.stack)
    }

    this.modules.install()
    await this.hapiServer.register(plugins)
    setViewEngine(this.hapiServer, config, this.modules.list)

    // start
    return !cli ? this.hapiServer.start() : this.cliInterface
  }

  getElementsToInject() {
    return {
      models: this.modules.models,
      server: this.hapiServer,
      config: this.config,
      scheduler: this.scheduler || {
        now: () => {
          this.logger.error('scheduler.now() called: config.scheduler.enable == false')
        },
      },
      logger: this.logger,
    }
  }

  constructor() {
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
      apps: [],
      commands: [],
      methods: [],
      install: () => {
        this.modules.methods.forEach((methodsFile) => {
          const methods = require(methodsFile).default(this.getElementsToInject())
          methods.forEach(m => this.hapiServer.method(m.name, m))
        })
        this.modules.apis.forEach((apisFile) => {
          const apis = require(apisFile).default(this.getElementsToInject())
          apis.forEach(a => this.hapiServer.route(a))
        })
        this.modules.apps.forEach((appsFile) => {
          require(appsFile).default(this.getElementsToInject())
          // apps.forEach(a => this.route(a))
        })
        this.modules.tasks.forEach((tasksFile) => {
          const tasks = require(tasksFile).default(this.getElementsToInject())
          tasks.forEach(t => this.scheduler.register(t.name, t.handler))
          // tasks.forEach(a => this.route(a))
        })
        this.modules.commands.forEach((command) => {
          require(command).default(this.getElementsToInject()).forEach((c) => {
            this.cliInterface[c.name] = c.handler
          })
        })
      },
    }
  }
}
