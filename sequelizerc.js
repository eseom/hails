/* .sequelizerc */
/* eslint-disable */

const fs = require('fs')

// assuming process.env.PWD is the project root_path
const settingsPath = `${process.env.PWD}/settings.js`
try {
  fs.statSync(settingsPath)
  module.exports = require(settingsPath)[
    process.env.NODE_ENV || 'development'].database
} catch (e) {
  console.error(`BootstrapError: [${settingsPath}] file is not exists.\n`)
  process.exit(-1)
}
