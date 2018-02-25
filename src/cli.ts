import Hails from './index'
import { CliInterface, CommandResult } from './interfaces'

(async () => {
  const hails = new Hails()
  const cliInterface = await hails.init({ cli: true })
  hails.logger.info('🚧  executing command')

  const command: string = process.argv[2]
  try {
    const result: CommandResult = (cliInterface as CliInterface)[command]()
    if ((result as Promise<number>).then)
      (result as Promise<number>).then((exitCode: number) => {
        process.exit(exitCode)
      })
    else
      process.exit((result as number))
  } catch (e) {
    if (e instanceof TypeError) { // no such command
      hails.logger.error('no such command: %s', command)
      process.exit(127)
    }
  }
})()
