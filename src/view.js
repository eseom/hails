import * as Path from 'path'
import Nunjucks from 'nunjucks'

export const setViewEngine = (server, config, installedDirs) => {
  if (!config.viewEngine) { return }

  server.views({
    isCached: process.env.NODE_ENV === 'production',
    engines: {
      html: {
        compile: (src, options) => context =>
          Nunjucks.compile(src, options.environment).render(context),
        prepare: (options, next) => {
          options.compileOptions.environment =
            Nunjucks.configure(options.path, { watch: false })
          return next()
        },
      },
    },
    relativeTo: process.cwd(),
    path: installedDirs.map(d => Path.join(d, 'templates')),
  })
}
