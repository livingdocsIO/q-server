const Boom = require("@hapi/boom");
const Wreck = require("@hapi/wreck");
const querystring = require("querystring");

exports.getToolResponse = async function(options, request, h) {
  if (request.query.appendItemToPayload) {
    // Get item with ignoreInactive set to true (gets inactive or active item)
    const item = await request.server.methods.db.item.getById({
      id: request.query.appendItemToPayload,
      ignoreInactive: true,
      session: {
        credentials: request.auth.credentials,
        artifacts: request.auth.artifacts
      }
    });
    // do not allow appending an item of another tool
    if (request.params.tool !== item.tool) {
      return Boom.badRequest(
        `appending item is not from the tool ${request.params.tool}`
      );
    }
    if (request.payload) {
      request.payload.item = item;
    } else {
      request.payload = {
        item: item
      };
    }
  }
  const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);

  if (!tool) {
    return Boom.notFound(`Tool ${request.params.tool} is not known`);
  }

  let queryString = "";
  if (request.query && Object.keys(request.query).length > 0) {
    queryString = querystring.stringify(request.query);
  }

  let toolResponse;
  if (request.payload) {
    toolResponse = await Wreck.post(
      `${tool.baseUrl}/${request.params.path}?${queryString}`,
      {
        payload: request.payload
      }
    );
  } else {
    toolResponse = await Wreck.get(
      `${tool.baseUrl}/${request.params.path}?${queryString}`
    );
  }

  if (toolResponse.res.statusCode !== 200) {
    return toolResponse
  }

  // prepare the response to add more headers
  const response = h.response(toolResponse.payload);

  // set all the headers from the tool response
  for (const header in toolResponse.res.headers) {
    response.header(header, toolResponse.res.headers[header]);
  }

  // add Cache-Control directives from config if we do not have no-cache set in the tool response
  const CCHeader = toolResponse.res.headers["cache-control"] || ""
  const responseCacheControl = Wreck.parseCacheControl(CCHeader);
  if (responseCacheControl["no-cache"] !== true) {
    const configCacheControl = await request.server.methods.getCacheControlDirectivesFromConfig(
      options.get("/cache/cacheControl")
    );

    const defaultCacheControl = Wreck.parseCacheControl(configCacheControl.join(","));

    for (const directive of Object.keys(defaultCacheControl)) {
      // only add the default cache control if the directive is not present on the response from the tool
      if (!responseCacheControl.hasOwnProperty(directive)) {
        const directiveValue = `${directive}=${defaultCacheControl[directive]}`
        response.header("cache-control", directiveValue,{ append: true});
      }
    }
  }

  // strip whitespace from cache-control header value to be consistent
  response.header("cache-control", response.headers["cache-control"].replace(/ /g, ""));
  return response;
};
