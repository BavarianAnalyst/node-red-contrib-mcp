module.exports = function (RED) {
  function McpToolListNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.server = RED.nodes.getNode(config.server);

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      if (!node.server) {
        done(new Error('No MCP server configured'));
        return;
      }

      node.status({ fill: 'blue', shape: 'dot', text: 'listing...' });

      node.server.connection.listTools().then(function (tools) {
        msg.payload = tools;
        msg.toolCount = tools.length;
        node.status({ fill: 'green', shape: 'dot', text: tools.length + ' tools' });
        send(msg);
        done();
      }).catch(function (err) {
        node.status({ fill: 'red', shape: 'ring', text: 'error' });
        done(err);
      });
    });
  }

  RED.nodes.registerType('mcp-tool-list', McpToolListNode);
};
