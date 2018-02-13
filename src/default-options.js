export default {
  context: undefined,
  vesion: undefined,
  connection: {
    host: '0.0.0.0',
    port: 3000,
  },
  logger: {
    level: 'silly',
  },
  modules: [],
  moduleFilenames: ['api', 'app', 'method', 'view', 'task', 'command'],
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
      type: 'memory',
    },
    cookieOptions: {
      password: 'the-password-must-be-at-least-32-characters-long',
      isSecure: false,
    },
  },
}
