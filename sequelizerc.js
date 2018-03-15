/* .sequelizerc */
/* eslint-disable */

const fs = require('fs')
const { getSettings } = require('./lib/settings')

module.exports = getSettings().database || {}
