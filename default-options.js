module.exports = {
  version: undefined,
  port: 3000,
  modules: [],
  moduleFilenames: ['api', 'view', 'task'],
  modelFilenames: ['model'],
  useSequelize: true,
  redis: {
    url: 'redis://localhost:6379/0',
  },
  swagger: {
    info: {
      title: 'API Documentation',
    },
    grouping: 'tags',
  },
  yar: {
    storeBlank: false,
    maxCookieSize: 0, // use server side storage
    cache: {
      cache: 'session',
    },
    cookieOptions: {
      password: 'the-password-must-be-at-least-32-characters-long',
      isSecure: false,
    },
  }
}
