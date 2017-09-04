import * as winston from 'winston'

export const logger: winston.LoggerInstance = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
  ],
})
