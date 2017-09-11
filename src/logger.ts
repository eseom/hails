import * as winston from 'winston'

winston.setLevels(winston.config.syslog.levels)

let hailsLogger: winston.LoggerInstance

export interface LoggerConfig {
}

export interface LogInstance {
  error: winston.LeveledLogMethod
  warn: winston.LeveledLogMethod
  info: winston.LeveledLogMethod
  verbose: winston.LeveledLogMethod
  debug: winston.LeveledLogMethod
  silly: winston.LeveledLogMethod
}

export const instance: LogInstance = {
  error: (msg: string, ...args: any[]) => hailsLogger.error(msg, ...args),
  warn: (msg: string, ...args: any[]) => hailsLogger.warn(msg, ...args),
  info: (msg: string, ...args: any[]) => hailsLogger.info(msg, ...args),
  verbose: (msg: string, ...args: any[]) => hailsLogger.verbose(msg, ...args),
  debug: (msg: string, ...args: any[]) => hailsLogger.debug(msg, ...args),
  silly: (msg: string, ...args: any[]) => hailsLogger.silly(msg, ...args),
}

export const initLogger = (loggerConfig: LoggerConfig) => {
  hailsLogger = new winston.Logger({
    transports: [
      new (winston.transports.Console)(loggerConfig),
    ],
  })
}

export const systemLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      label: "system",
    }),
  ],
})
