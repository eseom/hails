import Hails from './index'

(async () => {
  const hails = new Hails()
  const cliInterface = await hails.init({ cli: true })
  hails.logger.info('🚧  executing command')
  // console.log(cliInterface)

  const command = process.argv[2]
  try {
    const result = cliInterface[command]()
    if (result.then) {
      result.then((exitCode) => {
        process.exit(exitCode)
      })
    } else {
      process.exit(result)
    }
  } catch (e) {
    if (e instanceof TypeError) { // no such command
      hails.logger.error('no such command: %s', command)
      process.exit(127)
    }
  }
})()
