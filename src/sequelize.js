/* eslint-disable import/no-dynamic-require */

import Sequelize from 'sequelize'

export const getSequelizeInstance = (logger, config) => {
  let sequelize
  if (config.useSequelize) {
    if (!config.database.url) {
      config.database.url = ''
    }
    if (!config.database) {
      logger.error('options.database { url: string, options: object } is not exists.')
      process.exit(1)
    }
    const { url, options } = (() => {
      if (!config.database.url) {
        return {
          url: '',
          options: config.database,
        }
      }
      return {
        url: config.database.url,
        options: config.database.options,
      }
    })()
    if (options.dialect) { require(`./database/${options.dialect}`) }
    if (typeof options.logging === 'undefined') { options.logging = logger.silly }
    if (url) {
      sequelize = new Sequelize(url, options)
    } else {
      // TODO username, password
      sequelize = new Sequelize('', '', '', options)
    }
  }
  return sequelize
}

export const getSequelizeDataTypes = () => (Sequelize)
