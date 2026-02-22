module.exports = function (RED) {
  function LlmConfigNode(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  RED.nodes.registerType('llm-config', LlmConfigNode, {
    credentials: {
      apiKey: { type: 'password' },
    },
  });
};
