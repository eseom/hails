import winston from 'winston'
// const winston = require('winston')

winston.setLevels(winston.config.syslog.levels)

export const initLogger = (loggerConfig) => {
  const hailsLogger = new winston.Logger({
    transports: [
      new (winston.transports.Console)(loggerConfig),
    ],
  })
  return {
    error: (msg, ...args) => hailsLogger.error(msg, ...args),
    warn: (msg, ...args) => hailsLogger.warn(msg, ...args),
    info: (msg, ...args) => hailsLogger.info(msg, ...args),
    verbose: (msg, ...args) => hailsLogger.verbose(msg, ...args),
    debug: (msg, ...args) => hailsLogger.debug(msg, ...args),
    silly: (msg, ...args) => hailsLogger.silly(msg, ...args),
  }
}

export const systemLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      label: 'system',
    }),
  ],
})
