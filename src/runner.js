/* eslint-disable import/no-dynamic-require */

const Hails = require('./index')
const chokidar = require('chokidar')
const Path = require('path')
const hotload = require('hotload')

let server = new Hails.Server()
server.init().then((done) => {
  server.logger.info('🚧  server has started.')
  done()
})
if (process.env.NODE_ENV !== 'production') {
  const settingsFile = Path.resolve(process.cwd(), 'settings.js')
  const options = require(settingsFile)[process.env.NODE_ENV || 'development']
  const watcher = chokidar.watch(Path.resolve(process.cwd(), `${options.context}/**/*`), {})
  watcher.on('change', (path) => {
    server.logger.info('changed', path)
    // console.log(require.cache[require.resolve(path)])
    // delete require.cache[require.resolve(path)]
    // require.cache = {};
    hotload(require.resolve(path))
    // delete require.cache
    const newHails = hotload('./index')
    const promises = []
    promises.push(server.stop())
    if (server.scheduler) {
      promises.push(server.scheduler.stop())
    }
    Promise.all(promises).then(() => {
      // TODO error
      // server.scheduler.stop()
      server.logger.info('restarting...')
      server = new newHails.Server()
      server.init().then((done) => {
        server.logger.info('server has started.')
        done()
      })
    })
  })
}
