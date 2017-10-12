import * as Path from 'path'
import * as Nunjucks from 'nunjucks'

export const setViewEngine = (server, config, installedDirs) => {
  if (!config.viewEngine) { return }

  const isCached = process.env.NODE_ENV === 'production'
  const templateDirs = installedDirs.map(d => Path.join(d, 'templates'))

  const viewsOptions = {
    isCached,
    defaultExtension: 'njk',
    engines: {
      njk: {
        // TODO options any
        compile(src, options) {
          const template = Nunjucks.compile(src, options.environment)
          return context => template.render(context)
        },
        prepare(options, next) {
          options.compileOptions.environment = Nunjucks.configure(options.path, {
            watch: false,
          })
          return next()
        },
      },
    },
    path: templateDirs,
  }
  server.views(viewsOptions)
  // viewsOptions.forEach((vo) => {
  //   server.views(vo)
  // })
}
