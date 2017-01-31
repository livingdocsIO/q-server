const fetch = require('node-fetch');
const Boom = require('boom');
const server = require('../server').getServer();
const deleteMetaProperties = require('../helper/meta-properties').deleteMetaProperties;

function isToolConfiguredForTarget(toolName, target, tools) {
  let endpointConfig = tools.get(`/${toolName}/endpoint`, { target: target })
  if (endpointConfig) {
    return true;
  }
  return false;
}

function getRenderingInfo(data, target, toolRuntimeConfig) {

  if (!isToolConfiguredForTarget(data.tool, target, server.settings.app.tools)) {
    throw Boom.notImplemented(`no endpoint for tool ${data.tool} and target ${target}`);
  }

  const baseUrl = server.settings.app.tools.get(`/${data.tool}/baseUrl`, { target: target })
  const endpoint = server.settings.app.tools.get(`/${data.tool}/endpoint`, { target: target })

  const body = {
    item: deleteMetaProperties(data),
    toolRuntimeConfig: toolRuntimeConfig
  }
  return fetch(baseUrl + endpoint.path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        return response.json()
          .then(data => {
            throw Boom.create(response.status, data.message);
          })
      } else {
        return response.json();
      }
    })
    .then(renderingInfo => {
      // add the path to the stylesheets returned from rendering service
      if (renderingInfo.stylesheets !== undefined && renderingInfo.stylesheets.length > 0) {
        for (var i = 0; i < renderingInfo.stylesheets.length; i++) {
          let stylesheet = renderingInfo.stylesheets[i];
          if (stylesheet.name !== undefined) {
            stylesheet.path = `/tools/${data.tool}/stylesheet/${stylesheet.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.stylesheets && endpoint.stylesheets.length) {
        if (Array.isArray(renderingInfo.stylesheets)) {
          renderingInfo.stylesheets = renderingInfo.stylesheets.concat(endpoint.stylesheets);
        } else {
          renderingInfo.stylesheets = endpoint.stylesheets;
        }
      }

      // add the path to the scripts returned from rendering service
      if (renderingInfo.scripts !== undefined && renderingInfo.scripts.length > 0) {
        for (var i = 0; i < renderingInfo.scripts.length; i++) {
          let script = renderingInfo.scripts[i];
          if (script.name !== undefined) {
            script.path = `/tools/${data.tool}/script/${script.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.scripts && endpoint.scripts.length) {
        renderingInfo.scripts = renderingInfo.scripts.concat(endpoint.scripts)
      }

      return renderingInfo;
    })
}

module.exports = {
  getRenderingInfo: getRenderingInfo
}
