const fetch = require('node-fetch');
const environment = require('../helper/environment');
const server = require('../server');
const Boom = require('boom');
const parameter = require('../config/parameter');

var getScript = function(target, tool, name, next) {
	let toolProperties = environment.targets[target].tools[tool];
	fetch(toolProperties.baseUrl + '/scripts/' + name)
		.then(response => {
			return response.text();
		})
		.then(script => {
			next(null, script);
		})
		.catch(err => {
			const error = Boom.badRequest();
			next(error, null);
		})
}

server.method('getScript', getScript, {
  cache: {
    cache: 'memoryCache',
    expiresIn: parameter.serverCache * 1000,
    generateTimeout: 3000
  }
});

var scriptRoute = {
	method: 'GET',
	path: '/Q/{target}/script/{tool}/{name}',
	handler: function(request, reply) {
		server.methods.getScript(request.params.target, request.params.tool, request.params.name, (err, result) => {
			if (err) {
				return reply(err);
			}
			reply(result);
		})
	},
	config: {
		cache: {
			expiresIn: parameter.cacheControl * 1000, 
			privacy: 'public'
		},
		description: 'Get script from Q tool',
		tags: ['api']
	}
} 

module.exports = scriptRoute;