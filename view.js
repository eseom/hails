const Path = require('path')

module.exports = {
  setViewEngine(server, config, installedDirs) {
    if (!config.viewEngine) return

    const isCached = process.env.NODE_ENV === 'production'
    const templateDirs = installedDirs.map(d => Path.join(d, 'templates'))

    switch (config.viewEngine.type) {
      case 'handlebars':
        server.views({
          isCached: isCached,
          engines: {
            html: require('handlebars'),
          },
          relativeTo: __dirname,
          path: templateDirs,
        })
        break
      case 'nunjucks':
        const Nunjucks = require('nunjucks')
        server.views({
          isCached: isCached,
          engines: {
            html: {
              compile(src, options) {
                var template = Nunjucks.compile(src, options.environment)
                return (context) => {
                  return template.render(context);
                }
              },
              prepare(options, next) {
                options.compileOptions.environment = Nunjucks.configure(options.path, {
                  watch: false,
                });
                return next();
              }
            }
          },
          path: templateDirs,
        })
        break
      default:
        break
    }
  }
}
