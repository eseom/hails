const winston = require('winston')
const { format } = require('logform')

export default (loggerSettings) => {
  const alignedWithColorsAndTime = format.combine(
    format.splat(),
    format.colorize(),
    format((info, opts) => {
      info.timestamp = new Date().toLocaleString()
      return info
    })(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  )

  const logger = winston.createLogger({
    level: loggerSettings.level,
    transports: [
    ],
  })

  logger.add(new winston.transports.Console({
    format: alignedWithColorsAndTime,
    colorize: true,
  }));

  return logger
}

