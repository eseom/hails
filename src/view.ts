import { EngineConfigurationObject, ServerViewsConfiguration } from 'vision'
import * as Path from 'path'
import * as Nunjucks from 'nunjucks'
import * as Hapi from 'hapi'
import { Configuration } from './types'

export const setViewEngine = (server: Hapi.Server, config?: Configuration, installedDirs?: Array<string>) => {
  if (!config.viewEngine) { return }

  const isCached: boolean = process.env.NODE_ENV === 'production'
  const templateDirs: Array<string> = installedDirs.map(d => Path.join(d, 'templates'))

  let viewsOptions: ServerViewsConfiguration

  viewsOptions = {
    isCached: false,
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
  server.views(viewsOptions)
}