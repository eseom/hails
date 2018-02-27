import * as program from 'commander'
import { Command } from 'commander'
import Hails from './index'
import { CliInterface, CommandResult } from './interfaces'

(async () => {
  let p: Command = program
  const hails = new Hails()
  const cliInterface: CliInterface = (await hails.init({ cli: true })
    .catch((e) => {
      hails.logger.error('%s', e.toString())
      process.exit(-1)
    }) as CliInterface)

  p = p.version(hails.settings.version)
  hails.logger.info('🚧  executing command')

  const command: string = process.argv[2]
  try {
    const finalArguments: {
      [key: string]: string
    } = {}

    // description
    p.description(cliInterface[command].description)

    // get and set Commander options
    cliInterface[command].options.forEach((o) => {
      p = p.option.apply(p, o)
    })

    // set Commander arguments
    p.arguments(cliInterface[command].arguments)
    p.parse(process.argv)
    p._args.forEach((arg: any, index: number) => {
      if (typeof p.args[index + 1] === 'undefined' && arg.required) {
        hails.logger.error(`<${arg.name}> required on executing "${command}"`)
        process.exit(-1)
      }
      if (typeof p.args[index + 1] !== 'undefined')
        finalArguments[arg.name] = p.args[index + 1]
    })

    // execute
    const result: CommandResult = cliInterface[command].handler.apply(
      cliInterface[command].handler, [finalArguments, p.opts()]
    )
    if ((result as Promise<number>).then)
      (result as Promise<number>).then(async (exitCode: number) => {
        await hails.stop()
        process.exit(exitCode)
      })
    else {
      await hails.stop()
      process.exit((result as number))
    }
  } catch (e) {
    if (e instanceof TypeError) { // no such command
      hails.logger.error('Bootstrap error: no such command: "%s"', command)
      process.exit(127)
    }
  }
})()
