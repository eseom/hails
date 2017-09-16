import * as SequelizeStatic from 'sequelize'
import { DataTypes } from 'sequelize'
import * as Vision from 'vision'
import * as Hapi from 'hapi'
import * as kue from 'kue'

export interface IServer extends Hapi.Server {
  /**
   * initialize hails server
   */
  init?: (options: Configuration) => Promise<{}>
  /**
   * hails config
   */
  config?: Object
  /**
   * scheduler interface
   */
  scheduler?: Scheduler
  /**
   * sequelize Sequelize
   */
  sequelize?: SequelizeStatic.Sequelize
  /**
   * sequelize DataTypes
   */
  DataTypes?: DataTypes
}

export type ModulesContainer = {
  list: Array<string>
  files: Array<string>
  push: (item: string) => void
  install: () => void
}

export interface Models {
  [key: string]: any
}

export interface Scheduler {
  register: (name: string, callback: (job: kue.Job, done: () => void) => void) => void
  now: (name: string, options: object) => void
}

export interface CustomDatabaseOptions {
  url?: string,
  options?: SequelizeStatic.Options
}

export type DatabaseOptions = CustomDatabaseOptions | SequelizeStatic.Options

export interface Configuration {
  version?: string
  modules?: Array<string>,
  connection?: Hapi.ServerConnectionOptions,
  redis?: {
    url?: string
  }
  swagger?: {
    info?: {
      version?: string
    }
  }
  yar?: {
    storeBlank?: boolean
    maxCookieSize?: number
    cache?: {
      cache?: string
    }
  }
  plugins?: Array<any>
  auths?: Array<any>
  viewEngine?: {
    type?: string,
  }
  scheduler?: {
    enable?: boolean,
    broker?: {
      redis?: string
    }
    schedules?: Array<Array<string>>
  }
  useSequelize?: boolean
  database?: DatabaseOptions
}
