import Hails from './index'

(async () => {
  const hails = new Hails()
  const cliInterface = await hails.init({ cli: true })
  hails.logger.info('🚧  executing command')
  // console.log(cliInterface)
  const result = cliInterface[process.argv[2]]()
  if (result.then) {
    result.then((exitCode) => {
      process.exit(exitCode)
    })
  } else {
    process.exit(result)
  }
})()
