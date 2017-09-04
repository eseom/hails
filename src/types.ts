import * as Sequelize from 'sequelize'
import * as Hapi from 'hapi'

export interface IServer extends Hapi.Server {
  /**
   * initialize hails server
   */
  init?: (options) => Promise<() => {}>
  config?: Object
  scheduler?: any
  sequelize?: Sequelize.Sequelize
}

export interface ConfigurationObject {
  viewEngine: {
    type: string,
  }
  views: () => {}
}

export interface Configuration {
  version: string
}
