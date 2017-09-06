import { EngineConfigurationObject, ServerViewsConfiguration } from 'vision'
import { IServer, Configuration } from './types'
import * as Path from 'path'

export const setViewEngine = (server: IServer, config: Configuration, installedDirs: Array<string>) => {
  if (!config.viewEngine) { return }

  const isCached: boolean = process.env.NODE_ENV === 'production'
  const templateDirs: Array<string> = installedDirs.map(d => Path.join(d, 'templates'))

  let viewsOptions: ServerViewsConfiguration
  switch (config.viewEngine.type) {
    case 'handlebars':
      viewsOptions = {
        isCached: isCached,
        engines: {
          html: require('handlebars'),
        },
        relativeTo: __dirname,
        path: templateDirs,
      }
      break
    case 'nunjucks':
      const Nunjucks = require('nunjucks')
      viewsOptions = {
        isCached: isCached,
        engines: {
          html: {
            // TODO options any
            compile(src: string, options: any) {
              const template = Nunjucks.compile(src, options.environment)
              return (context: object) => {
                return template.render(context)
              }
            },
            prepare(options: any, next: (err?: Error) => void): void {
              options.compileOptions.environment = Nunjucks.configure(options.path, {
                watch: false,
              })
              return next()
            },
            registerPartial(name: string, src: string) { },
            registerHelper(name: string, helper: Function) { },
          },
        },
        path: templateDirs,
      }
      break
    default:
      break
  }
  server.views(viewsOptions)
}
