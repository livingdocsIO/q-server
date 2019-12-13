const Joi = require("@hapi/joi")

module.exports = {
  getGetToolsRoute: function() {
    return {
      path: "/editor/tools/locales/{lng}/translation.json",
      method: "GET",
      options: {
        description: "Returns tool name translations for given language",
        tags: ["api", "editor", "non-critical"],
        auth: {
          strategies: ["q-auth"],
          mode: "optional"
        },
        validate: {
          params: {
            lng: Joi.string().required()
          }
        }
      },
      handler: (request, h) => {
        const criteria = request.auth ? request.auth.credentials : {};
        const tools = request.server.settings.app.tools.get("", criteria)

        // compute a translation.json file for use by i18next for the given language
        // containing the tool name and it's localized label.
        const translations = {}
        for (const toolName in tools) {
          const tool = tools[toolName]
          if (
            !tool.editor.hasOwnProperty("label_locales") ||
            !tool.editor.label_locales.hasOwnProperty(request.params.lng)
          ) {
            continue
          }
          translations[toolName] =
            tool.editor.label_locales[request.params.lng];
        }

        return translations;
      }
    };
  },
  getGetEditorConfigRoute: function(options) {
    return {
      path: "/editor/locales/{lng}/translation.json",
      method: "GET",
      options: {
        description: "Returns editor translations for given language",
        tags: ["api", "editor", "non-critical"],
        auth: {
          strategies: ["q-auth"],
          mode: "optional"
        },
        validate: {
          params: {
            lng: Joi.string().required()
          }
        }
      },
      handler: (request, h) => {
        // compute a translation.json file for use by i18next for the given language
        const translations = {};
        let previewSizes;

        const criteria = request.auth ? request.auth.credentials : {};

        // check for the get function to be backwards compatible if the config object gets
        // passed directly instead of providing a Confidence getter
        if (options.editorConfig.get instanceof Function) {
          previewSizes = options.editorConfig.get('/previewSizes', criteria);
        } else {
          previewSizes = options.editorConfig.previewSizes;
        }

        if (previewSizes) {
          translations.preview = {};
          for (const previewSizeName in previewSizes) {
            const previewSize = previewSizes[previewSizeName];
            if (
              previewSize.hasOwnProperty("label_locales") &&
              previewSize.label_locales.hasOwnProperty(request.params.lng)
            ) {
              translations.preview[previewSizeName] =
                previewSize.label_locales[request.params.lng];
            }
          }
        }

        return translations;
      }
    };
  }
};
