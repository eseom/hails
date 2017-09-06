declare module 'hapi' {
  interface CatboxServerCacheConfiguration {
    url?: string
    cachePath?: string
  }
}

import * as SequelizeStatic from 'sequelize'
import { DataTypes } from 'sequelize'
import * as Hapi from 'hapi'

export interface Scheduler {
  register: (name: string, callback: (args?: any) => void) => void
  now: (name: string, options: object) => void
}

export interface IServer extends Hapi.Server {
  /**
   * initialize hails server
   */
  init?: (options: Configuration) => Promise<() => {}>
  config?: Object
  scheduler?: Scheduler
  sequelize?: SequelizeStatic.Sequelize
  DataTypes?: DataTypes
}

// export interface ConfigurationObject {
//   viewEngine: {
//     type: string,
//   }
//   views: () => {}
// }

export interface CustomDatabaseOptions {
  uri?: string,
  options?: SequelizeStatic.Options
}

export type DatabaseOptions = CustomDatabaseOptions | SequelizeStatic.Options

export interface Configuration {
  version?: string
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
    broker?: {
      redis?: string
    }
    schedules?: Array<Array<string>>
  }
  useSequelize?: boolean
  database?: DatabaseOptions
}