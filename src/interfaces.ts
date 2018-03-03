import * as kue from 'kue'
import * as winston from 'winston'
import * as Sequelize from 'sequelize'
import * as Hapi from 'hapi'

export interface InjectingElements {
  sequelize: Sequelize.Sequelize
  models: ModelDict
  server: Hapi.Server
  settings: Settings
  config: Settings
  scheduler: Scheduler
  logger: winston.LoggerInstance
}

export type CommandResult = Promise<number> | number

export interface CliInterface {
  [key: string]: {
    description?: string,
    arguments: string,
    options: string[][]
    handler(...args: any[]): CommandResult
  }
}

export interface LoggerSetting {
  level: string
}

export interface Scheduler {
  queue?: kue.Queue
  register?: (name: string, callback: (job: kue.Job, done: kue.DoneCallback) => void) => void
  now: (name: string, options?: object) => void
  stop?: () => any
}

export interface DatabaseUrlOptions {
  url?: string
  options?: {
    logging?: (msg: string, ...meta: any[]) => any // logging function
    dialect?: string
  }
}

export interface DatabaseOptions {
  logging?: (msg: string, ...meta: any[]) => any // logging function
  dialect?: string
}

export type Settings = {
  version?: string
  context: string
  modules?: string[]
  server?: {
    port?: number
  }
  swagger?: {
    info: {
      title: string
      version?: string
    }
    grouping: string
  }
  yar?: {
    engine?: {
      type?: string
    }
  }
  logger?: LoggerSetting
  redis?: {
    url: string
  }
  viewEngine?: {
    type: string
  }
  scheduler?: {
    enable: boolean
    broker?: {
      redis?: string
    }
    schedules?: string[][]
  }
  useSequelize?: boolean
  database?: DatabaseUrlOptions | DatabaseOptions
}

export type MethodDefinition = Hapi.ServerMethodConfigurationObject

export type RouteDefinition = Hapi.ServerRoute

export interface TaskDefinition {
  name: string
  handler: (job: kue.Job, done: kue.DoneCallback) => void

}

export interface ModelDefinition {
  model: string
  table: string
  fields: Sequelize.DefineAttributes
  initialize?: (models: ModelDict) => void
  options?: Sequelize.DefineOptions<any>,
}

export interface CommandDefinition {
  name: string
  description?: string
  arguments?: string
  options?: string[][],
  handler: (...args: any[]) => Promise<number> | number
}

export interface AuthDefinition {
  name: string
  handler: Hapi.ServerAuthScheme
}

export interface ModelDict {
  [key: string]: Sequelize.Model<any, any> & {
    initialize?: (models: ModelDict) => void
  } & {
    prototype?: any
    [key: string]: () => void
  }
}
