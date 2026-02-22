const { McpConnection } = require('../lib/mcp-client');

module.exports = function (RED) {
  function McpServerConfigNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.url = config.url;
    this.transportType = config.transportType || 'http';
    this.name = config.name;

    // Build auth headers
    var headers = {};
    if (this.credentials) {
      if (this.credentials.apiKey) {
        headers['Authorization'] = 'Bearer ' + this.credentials.apiKey;
      }
    }

    this.connection = new McpConnection({
      url: this.url,
      transport: this.transportType,
      headers: headers,
    });

    this.on('close', function (done) {
      node.connection.disconnect().then(done).catch(function () { done(); });
    });
  }

  RED.nodes.registerType('mcp-server-config', McpServerConfigNode, {
    credentials: {
      apiKey: { type: 'password' },
    },
  });
};
