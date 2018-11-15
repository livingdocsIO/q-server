const getToolResponse = require("./methods/getToolResponse.js").getToolResponse;

module.exports = {
  name: "q-base",
  dependencies: ["q-db"],
  register: async function (server, options) {
    await server.register([require("vision"), require("inert")]);
    server.method("getToolResponse", getToolResponse);
    server.method("getCacheControlDirectivesFromConfig", async function (
      cacheControlConfig
    ) {
      // return early if no config given, default is 'no-cache'
      if (!cacheControlConfig) {
        return ["no-cache"];
      }

      const cacheControlDirectives = [];

      if (cacheControlConfig.public) {
        cacheControlDirectives.push("public");
      }
      if (cacheControlConfig.maxAge) {
        cacheControlDirectives.push(`max-age=${cacheControlConfig.maxAge}`);
      }
      if (cacheControlConfig.sMaxAge) {
        cacheControlDirectives.push(`s-maxage=${cacheControlConfig.sMaxAge}`);
      }
      if (cacheControlConfig.staleWhileRevalidate) {
        cacheControlDirectives.push(
          `stale-while-revalidate=${cacheControlConfig.staleWhileRevalidate}`
        );
      }
      if (cacheControlConfig.staleIfError) {
        cacheControlDirectives.push(
          `stale-if-error=${cacheControlConfig.staleIfError}`
        );
      }

      return cacheControlDirectives;
    });

    server.event("item.new");
    server.event("item.update");
    server.event("item.activate");
    server.event("item.deactivate");
    server.event("item.delete");

    await server.route([
      require("./routes/item.js").get,
      require("./routes/item.js").post,
      require("./routes/item.js").put,
      require("./routes/search.js"),
      require("./routes/tool-default.js").getGetRoute(options),
      require("./routes/tool-default.js").getPostRoute(options),
      require("./routes/tool-schema.js").getSchema(options),
      require("./routes/tool-schema.js").getDisplayOptionsSchema(options),
      require("./routes/health.js"),
      require("./routes/version.js"),
      require("./routes/admin/migration.js")
    ]);
  }
};
