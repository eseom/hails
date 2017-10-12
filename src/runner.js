const Hails = require('./index')
const chokidar = require('chokidar')
const Path = require('path')
const hotload = require('hotload')

let server

server = new Hails.Server()

server.init().then((done) => {
  server.logger.info('🚧  server has started.')
  done()
})

const watcher = chokidar.watch(Path.resolve(process.cwd(), 'src/**/*'), {})

watcher.on('change', (path) => {
  server.logger.info('changed', path)
  delete require.cache[require.resolve(path)]
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

