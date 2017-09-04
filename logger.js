const winston = require('winston')

winston.setLevels(winston.config.syslog.levels);

let hailsLogger

module.exports = {
  instance: {
    error: (...args) => { hailsLogger.error(...args) },
    warn: (...args) => { hailsLogger.warn(...args) },
    info: (...args) => { hailsLogger.info(...args) },
    verbose: (...args) => { hailsLogger.verbose(...args) },
    debug: (...args) => { hailsLogger.debug(...args) },
    silly: (...args) => { hailsLogger.silly(...args) },
  },
  initLogger: (loggerConfig) => {
    hailsLogger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)(loggerConfig),
      ],
    })
  },
}
