---
title: Rendering Info
---

We use the term `rendering info` to describe the HTTP response from a request to _q-server/rendering-info/{id}/{target}_. This request is typically sent by a so called Q loader. Examples of Q loaders are the preview in Q editor or the browser based loader used in the [demo](https://q-demo.st.nzz.ch). The source for this browser based loader can be found on Github: [nzzdev/Q-loader-browser](https://github.com/nzzdev/Q-loader-browser).

## Format
The Q loader browser is our reference implementation for Q loaders. Currently the only type of `rendering info` supported by the Q editor preview is a JSON like this:
```
{
  "loaderConfig": {
    "polyfills": ["Promise", "Object.assign"],
    "loadSystemJs": "full"
  },
  "markup": "<p>markup applied using element.innerHTML</p>",
  "scripts": [
    {
      "url": "url to a javascript file"
    },
    {
      "name": "the name of a javascript file, see below 'on name and path' for more information about this"
    },
    {
      "url":  "url to a javascript file that should get loaded only once per page",
      "loadOnce": true
    }
  ],
  "stylesheets": [
    {
      "url": "url to a css file"
    },
    {
      "name": "the name of a stylesheet file, see below 'on name and path' for more information about this"
    }
  ]
}
```
- `loaderConfig.polyfills` is an array of features used to produce a url to the [polyfill.io](https://polyfill.io) service. The loader will merge the arrays for all Q items on a page together to produce one request to polyfill.io.

- `loaderConfig.loadSystemJs` tells the loader if it should load SystemJS. This is either `full` which loads SystemJS with support for different module types or `production` which loads a small version of SystemJS that can only load `System.register` modules.

## on name and path
In the example above you have seen the property `name` used in `scripts` and `stylesheets`. This is not quite what will be delivered by the Q server but what gets produced by the tool service. The Q server will translate the `name` to a `path` like this:
```
stylesheet.path = `/tools/${toolName}/stylesheet/${stylesheet.name}`;
```

This is because the tool service itself does not know about its name as the mapping of a tool name to a tool service is configured in _config/tools.js_ in your Q server implementation. See [https://github.com/nzzdev/Q-server-demo/blob/master/config/tools.js](https://github.com/nzzdev/Q-server-demo/blob/master/config/tools.js) as an example for this configuration.

So if your tool service provides an endpoint _/stylesheet/{name*}_ you can use `name` property in the rendering info returned from your tool service and Q server will translate it to a path. The loader knows where the Q server is running and can build a full URL using this information to request the file.

## other types of rendering info
We are thinking about how to extend the possibilities for the rendering info. Probably we will build support for other `Content-Type` headers than `application/json` to allow the tool services to respond with an image or `text/html` directly if it's the only thing that needs to get loaded. If you have ideas about this we are happy to talk to you.
