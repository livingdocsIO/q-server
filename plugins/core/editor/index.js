const Hoek = require("@hapi/hoek");

module.exports = {
  name: "q-editor-api",
  register: async function(server, options) {
    server.route([
      require("./routes/targets"),
      require("./routes/tools"),
      require("./routes/tools-ordered-by-user-usage"),
      require("./routes/locales").getGetToolsRoute(),
      require("./routes/locales").getGetEditorConfigRoute(options)
    ]);

    server.route({
      path: "/editor/config",
      method: "GET",
      options: {
        description: "Returns configuration for Q Editor",
        tags: ["api", "editor"],
        auth: {
          strategies: ['q-auth'],
          mode: 'optional'
        }
      },
      handler: (request, h) => {
        const criteria = request.auth ? request.auth.credentials : {};
        return options.editorConfig.get('/', criteria)
      }
    });
  }
};
