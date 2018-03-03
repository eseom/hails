export default {
  context: undefined,
  vesion: undefined,
  server: {
    host: 'localhost',
    port: 3000,
  },
  logger: {
    level: 'silly',
  },
  modules: [],
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
