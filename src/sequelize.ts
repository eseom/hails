import * as Sequelize from 'sequelize'
import * as winston from 'winston'
import { Settings, DatabaseUrlOptions, DatabaseOptions } from './interfaces'

export const getSequelizeInstance = (logger: winston.LoggerInstance, config: Settings): Sequelize.Sequelize => {
  let sequelize
  if (config.useSequelize) {
    if (!(config.database as DatabaseUrlOptions).url)
      (config.database as DatabaseUrlOptions).url = ''
    if (!config.database) {
      logger.error('options.database { url: string, options: object } is not exists.')
      process.exit(1)
    }
    const { url, options } = ((): DatabaseUrlOptions => {
      if (!(config.database as DatabaseUrlOptions).url)
        return {
          url: '',
          options: config.database as DatabaseOptions,
        }
      return {
        url: (config.database as DatabaseUrlOptions).url,
        options: (config.database as DatabaseUrlOptions).options,
      }
    })()
    if (options.dialect)
      require(`./database/${options.dialect}`)
    if (typeof options.logging === 'undefined')
      options.logging = (msg: string, ...meta: any[]) => { logger.silly(msg, ...meta) }
    if (url)
      sequelize = new Sequelize(url, options)
    else
      // TODO username, password
      sequelize = new Sequelize('', '', '', options)
  }
  return sequelize
}

export const getSequelizeDataTypes = () => (Sequelize)
