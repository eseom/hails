module.exports = {
  setViewEngine(server, config) {
    if (!config.viewEngine) return

    switch (config.viewEngine.type) {
      case 'handlebars':
        server.views({
          engines: {
            html: require('handlebars'),
          },
          relativeTo: __dirname,
          path: 'templates',
        })
        break
      case 'nunjucks':
        const Nunjucks = require('nunjucks')
        server.views({
          engines: {
            html: {
              compile(src, options) {
                var template = Nunjucks.compile(src, options.environment)
                return (context) => {
                  return template.render(context);
                }
              },
              prepare(options, next) {
                options.compileOptions.environment = Nunjucks.configure(options.path, { watch: false });
                return next();
              }
            }
          },
          path: 'templates',
        })
        break
      default:
        break
    }
  }
}
