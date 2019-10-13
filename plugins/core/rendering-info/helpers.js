const querystring = require("querystring");
const fetch = require("node-fetch");
const clone = require("clone");
const deepmerge = require("deepmerge");
const Boom = require("@hapi/boom");
const deleteMetaProperties = require("../../../helper/meta-properties")
  .deleteMetaProperties;

function getWithResolvedFunction (renderingInfoPart, item, toolRuntimeConfig) {
  return Promise.all(renderingInfoPart.map((renderingInfoPartItem) => {
    if (!(renderingInfoPartItem instanceof Function)) return renderingInfoPartItem
    return renderingInfoPartItem.call(this, item, toolRuntimeConfig)
  }))
}

function getWithResolvedNameProperty (typePath, renderingInfoPart, item, toolRuntimeConfig) {
  for (const segment of renderingInfoPart) {
    if (segment.name) {
      segment.path = `/tools/${item.tool}/${typePath}/${segment.name}`
      segment.name = undefined
    } else if (segment.path) {
      segment.path = `/tools/${item.tool}${segment.path.replace(/^\/?/, '/')}`
    }
  }

  return renderingInfoPart
}

async function getRenderingInfo(
  item,
  baseUrl,
  endpointConfig,
  toolRuntimeConfig,
  targetConfig,
  itemStateInDb
) {
  let requestUrl
  if (endpointConfig.hasOwnProperty('path')) {
    requestUrl = `${baseUrl}${endpointConfig.path}`;
  } else if (endpointConfig.hasOwnProperty('url')) {
    requestUrl = endpointConfig.url
  } else {
    throw new Error('Endpoint has no path nor url configured');
  }

  // add _id, createdDate and updatedDate as query params to rendering info request
  // todo: the tool could provide the needed query parameters in the config in a future version
  let queryParams = ["_id", "createdDate", "updatedDate"];
  let query = {};
  for (let queryParam of queryParams) {
    if (item.hasOwnProperty(queryParam) && item[queryParam]) {
      query[queryParam] = item[queryParam];
    }
  }
  let queryString = querystring.stringify(query);

  // strip the meta properties before sending the item to the tool service
  const body = {
    ns: item._ns,
    id: item._id,
    item: deleteMetaProperties(item),
    itemStateInDb: itemStateInDb,
    toolRuntimeConfig: toolRuntimeConfig
  };

  const response = await fetch(`${requestUrl}?${queryString}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Boom(data.message, { statusCode: response.status });
    } catch (err) {
      throw new Boom(err.message, { statusCode: response.status });
    }
  }

  let renderingInfo = await response.json();

  // check if the tool config has additional renderingInfo and apply it if so
  renderingInfo = deepmerge(
    renderingInfo,
    endpointConfig.additionalRenderingInfo || {},
    targetConfig.additionalRenderingInfo || {},
    {
      arrayMerge: (destArr, srcArr) => {
        return [...srcArr, ...destArr]
      }
    }
  )

  if (renderingInfo.stylesheets) {
    renderingInfo.stylesheets = await getWithResolvedFunction(
      renderingInfo.stylesheets, item, toolRuntimeConfig
    )

    renderingInfo.stylesheets = getWithResolvedNameProperty(
      'stylesheet', renderingInfo.stylesheets, item, toolRuntimeConfig
    )
  }

  if (renderingInfo.scripts) {
    renderingInfo.scripts = await getWithResolvedFunction(
      renderingInfo.scripts, item, toolRuntimeConfig
    )

    renderingInfo.scripts = getWithResolvedNameProperty(
      'script', renderingInfo.scripts, item, toolRuntimeConfig
    )
  }

  return renderingInfo
}

function getCompiledToolRuntimeConfig(
  item,
  { serverWideToolRuntimeConfig, toolEndpointConfig, requestToolRuntimeConfig }
) {
  const overallToolRuntimeConfig = serverWideToolRuntimeConfig;

  // simplify the toolBaseUrl to an url string if it is an object by applying some defaults before sending it to the tool
  if (
    typeof overallToolRuntimeConfig.toolBaseUrl === "object" &&
    overallToolRuntimeConfig.toolBaseUrl.host
  ) {
    // the default protocol is https
    let protocol = "https";
    if (overallToolRuntimeConfig.toolBaseUrl.protocol) {
      protocol = overallToolRuntimeConfig.toolBaseUrl.protocol;
    }
    // the default if no path is given is to add /tools/{toolname}
    let path = `/tools/${item.tool}`;
    if (overallToolRuntimeConfig.toolBaseUrl.path) {
      path = overallToolRuntimeConfig.toolBaseUrl.path;
    }
    overallToolRuntimeConfig.toolBaseUrl = `${protocol}://${
      overallToolRuntimeConfig.toolBaseUrl.host
    }${path}`;
  }

  // simplify the fileRequestBaseUrl to an url string if it is an object by applying some defaults before sending it to the tool
  if (
    typeof overallToolRuntimeConfig.fileRequestBaseUrl === "object" &&
    overallToolRuntimeConfig.fileRequestBaseUrl.host
  ) {
    // the default protocol is https
    let protocol = "https";
    if (overallToolRuntimeConfig.fileRequestBaseUrl.protocol) {
      protocol = overallToolRuntimeConfig.fileRequestBaseUrl.protocol;
    }
    // the default if no path is given is /file
    let path = "/file";
    if (overallToolRuntimeConfig.fileRequestBaseUrl.path) {
      path = overallToolRuntimeConfig.fileRequestBaseUrl.path;
    }
    overallToolRuntimeConfig.fileRequestBaseUrl = `${protocol}://${
      overallToolRuntimeConfig.fileRequestBaseUrl.host
    }${path}`;
  }

  // default to the overall config
  let toolRuntimeConfig = overallToolRuntimeConfig;

  // add the item id if given
  if (item.hasOwnProperty("_id")) {
    toolRuntimeConfig.id = item._id;
  }

  // if endpoint defines tool runtime config, apply it
  if (toolEndpointConfig && toolEndpointConfig.toolRuntimeConfig) {
    toolRuntimeConfig = Object.assign(
      toolRuntimeConfig,
      toolEndpointConfig.toolRuntimeConfig
    );
  }

  // apply to runtime config from the request
  toolRuntimeConfig = Object.assign(
    toolRuntimeConfig,
    requestToolRuntimeConfig
  );

  return toolRuntimeConfig;
}

module.exports = {
  getRenderingInfo: getRenderingInfo,
  getCompiledToolRuntimeConfig: getCompiledToolRuntimeConfig
};
