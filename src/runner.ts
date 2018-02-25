import * as Path from 'path'
import * as chokidar from 'chokidar'
import * as hotload from 'hotload'

import Hails from './index'

(async () => {
  let hails = new Hails()
  await hails.init({})
  hails.logger.info('🚧  server has started.')

  if (process.env.NODE_ENV !== 'production') {
    const settingsFile = Path.resolve(process.cwd(), 'settings.js')
    const settings = require(settingsFile)[process.env.NODE_ENV || 'development']
    const watcher = chokidar.watch(Path.resolve(process.cwd(), `${settings.context}/**/*.js`), {})
    watcher.on('change', async (path: string) => {
      hails.logger.info('changed', path)
      hotload(require.resolve(path))
      const NewHails = hotload('./index').default
      const promises: Promise<any>[] = []
      promises.push(hails.stop())
      await Promise.all(promises)
      hails.logger.info('restarting...')
      hails = new NewHails()
      await hails.init({})
      hails.logger.info('🚧  server has started.')
    })
  }
})()
