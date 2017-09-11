import * as Sequelize from 'sequelize'
import * as winston from 'winston'
import { Configuration, CustomDatabaseOptions, DatabaseOptions } from './types'

export const getSequelizeInstance = (logger: winston.LoggerInstance, config: Configuration): Sequelize.Sequelize => {
  let sequelize
  if (config.useSequelize) {
    if (!(<CustomDatabaseOptions>config.database).url) {
      (<CustomDatabaseOptions>config.database).url = ''
    }
    if (!config.database) {
      logger.error('options.database { url: string, options: object } is not exists.')
      process.exit(1)
    }
    let url = ''
    let options: Sequelize.Options
    if (!(<CustomDatabaseOptions>config.database).url) {
      options = config.database as any // TODO
    } else {
      url = (<CustomDatabaseOptions>config.database).url
      options = (<CustomDatabaseOptions>config.database).options
    }
    if (options.dialect) { require(`./database/${options.dialect}`) }
    if (typeof options.logging === 'undefined') { options.logging = logger.silly }
    if (url) {
      sequelize = new Sequelize(url, options)
    } else {
      // TODO username, password
      sequelize = new Sequelize('', '', options)
    }
  }
  return sequelize
}

export const getSequelizeDataTypes = () => (Sequelize)