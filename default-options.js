module.exports = {
  vesion: undefined,
  connection: {
   host: '0.0.0.0',
	port: 3000,
  },
  logger: {
    level: 'silly',
    colorize: true,
  },
  modules: [],
  moduleFilenames: ['api', 'view', 'task'],
  modelFilenames: ['model'],
  useSequelize: false,
  viewEngine: {
    type: 'nunjucks',
  },
  scheduler: {
    enable: false,
  },
  swagger: {
    info: {
      title: 'API Documentation',
    },
    grouping: 'tags',
  },
  yar: {
    engine: {
      type: 'disk',
      cachePath: '/tmp',
    },
    cookieOptions: {
      password: 'the-password-must-be-at-least-32-characters-long',
      isSecure: false,
    },
  }
}
