import * as Path from 'path'
import * as Nunjucks from 'nunjucks'
import * as Hapi from 'hapi'
import { Settings } from './interfaces'

export const setViewEngine = (server: Hapi.Server, config: Settings, installedDirs: string[]) => {
  if (!config.viewEngine) return

  server.views({
    isCached: process.env.NODE_ENV === 'production',
    engines: {
      html: {
        compile: (src: string, options: {
          environment: Nunjucks.Environment
        }) => (context: object) =>
            Nunjucks.compile(src, options.environment).render(context),
        prepare: (options: { compileOptions: {
          environment: Nunjucks.Environment
        }, path: string }, next: () => void) => {
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
