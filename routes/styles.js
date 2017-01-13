const fetch = require('node-fetch');
const getServer = require('../server').getServer;
const server = getServer();
const Boom = require('boom');
const defaults = require('../config/defaults');

var getStylesheet = function(target, tool, name, next) {
  fetch(`${target.tools[tool].baseUrl}/stylesheet/${name}`)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.text();
    })
    .then(stylesheet => {
      next(null, stylesheet);
    })
    .catch(err => {
      if (err.isBoom) {
        next(err, null);
      } else {
        const error = Boom.badRequest();
        next(error, null);
      }
    })
}

server.method('getStylesheet', getStylesheet, {
  cache: {
    expiresIn: (server.settings.app.misc.get('/cache/serverCacheTime') !== undefined ? server.settings.app.misc.get('/cache/serverCacheTime') : defaults.serverCache),
    generateTimeout: 10000
  },
  generateKey: function(target, tool, stylesheetName) {
    return `${tool}:${stylesheetName}:${JSON.stringify(target)}`
  }
});

var styleRoute = {
  method: 'GET',
  path: '/{target}/{tool}/stylesheet/{stylesheetName}',
  handler: function(request, reply) {
    const target = request.server.settings.app.targets.get(`/${request.params.target}`)
    request.server.methods.getStylesheet(target, request.params.tool, request.params.stylesheetName, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result)
    })
  },
  config: {
    cache: {
      expiresIn: (server.settings.app.misc.get('/cache/cacheControl/maxAge') || defaults.cacheControl.maxAge) * 1000,
      privacy: 'public'
    },
    description: 'Returns the css by the given name by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = styleRoute;
