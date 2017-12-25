import * as Path from 'path'
import Twig from 'twig'

export const setViewEngine = (server, config, installedDirs) => {
  if (!config.viewEngine) { return }

  const production = process.env.NODE_ENV === 'production'

  server.views({
    isCached: production,
    engines: {
      twig: {
        compile: (src, options) => context => Twig.twig({
          ...(production ? { id: options.filename } : {}),
          data: src,
        }).render(context),
      },
    },
    // relativeTo: __dirname,
    path: installedDirs.map(d => Path.join(d, 'templates')),
  });
}
