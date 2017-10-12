try {
  const config = require('../package.json').babel

  config.plugins = config.plugins.map(item => require.resolve(item))

  require('babel-register')(config)
  require('babel-polyfill')
} catch (err) {
  console.error('==>     ERROR: Error parsing your config in package.json.')
  console.error(err)
}
