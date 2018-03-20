import * as Path from 'path'
import * as Hapi from 'hapi'
import * as Hoek from 'hoek'
import * as Fs from 'fs'
import * as Vision from 'vision'
import * as Sequelize from 'sequelize'
import * as Nes from 'nes'
import * as Blipp from 'blipp'
import * as Inert from 'inert'

import * as winston from 'winston'

import initializeLogger from './logger'
import getScheduler from './scheduler'
import { getSettings } from './settings'
import { getSequelizeInstance, getSequelizeDataTypes } from './sequelize'
import { setViewEngine } from './view'
import admin from './admin'
import {
  InjectingElements, Scheduler,
  CliInterface, ModelDict, MethodDefinition, TaskDefinition,
  CommandDefinition, ModelDefinition, Settings
} from './interfaces'

export * from './interfaces'

class BootstrapError extends Error {
  constructor(...args: any[]) {
    super(...args)
    this.name = 'BootstrapError'
    Error.captureStackTrace(this, BootstrapError)
  }
}

const allFiles = ['api', 'app', 'method', 'view', 'task', 'command', 'model', 'admin']

export default class Hails {
  hapiServer: Hapi.Server = undefined
  logger: winston.LoggerInstance = undefined
  config: Settings = undefined
  settings: Settings = undefined
  cliInterface: CliInterface = {}
  scheduler: Scheduler = undefined
  sequelize: Sequelize.Sequelize = undefined
  DataTypes: Sequelize.DataTypes = undefined
  modules: {
    list: string[]
    models: ModelDict
    tasks: string[]
    apis: string[]
    apps: string[]
    commands: string[]
    admins: string[]
    methods: string[]
  } = {
      list: [],
      models: {},
      tasks: [],
      apis: [],
      apps: [],
      commands: [],
      admins: [],
      methods: [],
    }

  require(filename: string) {
    return require(filename).default(this.getElementsToInject())
  }

  makeDefaultOptions() {
    return Hoek.applyToDefaults(this.settings.server, {
      routes: {
        json: {
          space: 2,
        },
      },
      // server cache for session
      cache: (() => {
        if (this.settings.yar.engine.type === 'redis')
          return {
            engine: require('catbox-redis'),
            name: 'session',
            url: this.settings.redis.url,
          }
        return {
          engine: require('catbox-memory'),
          name: 'session',
        }
      })(),
    })
  }

  async init({ cli = false }) {
    // settings
    const settings: Settings = this.config = this.settings = getSettings()

    // initialize logger
    const logger: winston.LoggerInstance = this.logger = initializeLogger(settings.logger)
    logger.info('applying settings from settings.js...')

    // hapi server
    this.hapiServer = new Hapi.Server(this.makeDefaultOptions())

    // scheduler
    this.scheduler = settings.scheduler.enable ? getScheduler(settings, logger) : undefined

    // models
    if (settings.useSequelize) {
      this.sequelize = getSequelizeInstance(logger, settings)
      this.DataTypes = getSequelizeDataTypes()
    }

    // modules to install
    this.modules.list = settings.modules.map((m: string) => Path.join(settings.context, m))

    // get modules files
    settings.modules.forEach((m: string) => allFiles.forEach((mod: string) => {
      const moduleName = Path.join(Path.resolve(settings.context), m, mod)
      try {
        Fs.statSync(`${moduleName}.js`)
      } catch (e) {
        return
      }
      try {
        switch (mod) {
          case 'model':
            if (settings.useSequelize) {
              const importedModels = require(moduleName).default
              importedModels(this.DataTypes, this).forEach((mf: ModelDefinition) => {
                (this.modules.models[mf.model] as Sequelize.Model<any, any>) =
                  this.sequelize.define(mf.table, mf.fields, mf.options || {})


                this.modules.models[mf.model]['initialize'] = mf.initialize ? mf.initialize : () => { }
                // // for sequelize 4
                // // instance methods
                // const im = mf.options && mf.options.instanceMethods
                // const cm = mf.options && mf.options.classMethods
                // if (im)
                //   Object.keys(im).forEach((key) => {
                //     this.modules.models[mf.model].prototype[key] = im[key]
                //   })
                // // class methods
                // if (cm)
                //   Object.keys(cm).forEach((key: string) => {
                //     this.modules.models[mf.model][key] = cm[key]
                //   })
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
          case 'admin':
            this.modules.admins.push(moduleName)
            break
          default:
            break
        }
      } catch (e) {
        this.logger.error('%s %j', e.toString(), e.stack)
        process.exit(-1)
      }
    }))

    // intiialize models
    if (settings.useSequelize)
      Object.keys(this.modules.models).forEach((modelName: string) => {
        if (this.modules.models[modelName].initialize)
          this.modules.models[modelName].initialize(this.modules.models)
      })

    // rewrite swagger version
    settings.swagger.info.version = settings.version

    // include auth
    const auths = (() => {
      try {
        const authImported = require(
          Path.join(Path.resolve(settings.context), 'auth.js')).default
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
        options: settings.yar,
      },
      {
        plugin: require('hapi-swagger'),
        options: settings.swagger,
      },
      Blipp,
      Nes,
      ...((() => {
        try {
          return require(
            Path.join(Path.resolve(settings.context), 'plugin.js')).default
        } catch (e) {
          return []
        }
      })()),
    ]

    // auth
    try {
      if (auths)
        auths.forEach((auth: any) => {
          if (auth.name) {
            this.hapiServer.auth.scheme(auth.name, auth.handler)
            this.hapiServer.auth.strategy(auth.name, auth.name)
          } else { // for previous versions
            this.hapiServer.auth.scheme(auth[0], auth[1])
            this.hapiServer.auth.strategy(auth[0], auth[0])
          }
        })
    } catch (e) {
      logger.error(e, e.stack)
    }

    // hapi plugin
    await this.hapiServer.register(plugins)

    // install user modules
    this.install()

    // set view engine
    setViewEngine(this.hapiServer, settings, this.modules.list)

    // start
    return !cli ? this.hapiServer.start() : this.cliInterface
  }

  install() {
    this.modules.apps.forEach((appsFile: string) =>
      this.require(appsFile))
    this.modules.methods.forEach((methodsFile) =>
      this.require(methodsFile)
        .forEach((m: MethodDefinition) =>
          this.hapiServer.method(m.name, m.method, m.options)))
    this.modules.apis.forEach((apisFile) =>
      this.require(apisFile)
        .forEach((a: Hapi.ServerRoute) =>
          this.hapiServer.route(a)))
    this.modules.tasks.forEach((tasksFile) =>
      this.require(tasksFile)
        .forEach((t: TaskDefinition) =>
          this.scheduler.register(t.name, t.handler)))
    this.modules.commands.forEach((commandsFile) =>
      this.require(commandsFile)
        .forEach((c: CommandDefinition) => {
          if (!c.handler) throw new BootstrapError(`no given handler on command "${c.name}" "${commandsFile}"`)
          this.cliInterface[c.name] = {
            description: c.description || '',
            arguments: c.arguments || '',
            options: c.options || [],
            handler: c.handler,
          }
        }))
    this.modules.admins.forEach((adminsFile) => {
      const admins: any[] = []
      this.require(adminsFile)
        .forEach((a: any) => {
          admins.push(a)
        })
      admin.register(this.hapiServer, admins)
    })

    // static directories
    this.hapiServer.route({
      path: '/static/{p*}',
      method: 'get',
      handler: {
        directory: {
          path: this.modules.list.map(m => `${m}/static`),
        },
      },
    })
  }

  getElementsToInject(): InjectingElements {
    return {
      sequelize: this.sequelize,
      models: this.modules.models,
      server: this.hapiServer,
      settings: this.settings,
      config: this.settings, // for previous versions
      scheduler: this.scheduler || {
        now: () => {
          this.logger.error('scheduler.now() called: settings.scheduler.enable == false')
        },
      },
      logger: this.logger,
    }
  }

  async stop() {
    if (this.scheduler)
      await this.scheduler.stop()
    await this.hapiServer.stop({ timeout: 10000 })
  }
}
