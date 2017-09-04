import * as Sequelize from 'sequelize'
import * as Hapi from 'hapi'

interface Server extends Hapi.Server {
  init?: (options) => {}
  config?: Object,
  scheduler?: any,
  sequelize?: Sequelize.Sequelize,
}