import * as Sequelize from 'sequelize'
import * as winston from 'winston'
import { Configuration, CustomDatabaseOptions, DatabaseOptions } from './types'

export const getSequelizeInstance = (logger: winston.LoggerInstance, config: Configuration) => {
  let sequelize
  if (config.useSequelize) {
    if (!(<CustomDatabaseOptions>config.database).uri) {
      (<CustomDatabaseOptions>config.database).uri = ''
    }
    if (!config.database) {
      logger.error('options.database { uri: string, options: object } is not exists.')
      process.exit(1)
    }
    let uri = ''
    let options: Sequelize.Options
    if (!(<CustomDatabaseOptions>config.database).uri) {
      options = config.database as any // TODO
    } else {
      uri = (<CustomDatabaseOptions>config.database).uri
      options = (<CustomDatabaseOptions>config.database).options
    }
    if (options.dialect) { require(`./database/${options.dialect}`) }
    if (typeof options.logging === 'undefined') { options.logging = logger.silly }
    if (uri) {
      sequelize = new Sequelize(uri, options)
    } else {
      sequelize = new Sequelize(undefined, options)
    }
  }
  return sequelize
}