import * as winston from 'winston'
import { format } from 'logform'
import { LoggerSetting } from './interfaces'

export default (loggerSettings: LoggerSetting): winston.LoggerInstance => {
  const alignedWithColorsAndTime = format.combine(
    format.splat(),
    format.colorize(),
    format((info, opts) => {
      info.timestamp = new Date().toLocaleString()
      return info
    })(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  )
  const logger: winston.LoggerInstance = (winston as any).createLogger({
    level: loggerSettings.level,
    transports: [
    ],
  })
  logger.add(new winston.transports.Console({
    format: alignedWithColorsAndTime,
    colorize: true,
  }))
  return logger
}

