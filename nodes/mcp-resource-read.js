module.exports = function (RED) {
  function McpResourceReadNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.server = RED.nodes.getNode(config.server);
    this.uri = config.uri || '';

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      if (!node.server) {
        done(new Error('No MCP server configured'));
        return;
      }

      var uri = node.uri || msg.topic || '';
      if (!uri) {
        done(new Error('No resource URI — set in node config or msg.topic'));
        return;
      }

      node.status({ fill: 'blue', shape: 'dot', text: 'reading...' });

      node.server.connection.readResource(uri).then(function (result) {
        var contents = result.contents || [];
        if (contents.length === 1) {
          msg.payload = contents[0].text || contents[0].blob || contents[0];
          try { msg.payload = JSON.parse(msg.payload); } catch (_) { /* keep as string */ }
        } else {
          msg.payload = contents;
        }
        msg.mcpResult = result;
        node.status({ fill: 'green', shape: 'dot', text: 'done' });
        send(msg);
        done();
      }).catch(function (err) {
        node.status({ fill: 'red', shape: 'ring', text: 'error' });
        done(err);
      });
    });
  }

  RED.nodes.registerType('mcp-resource-read', McpResourceReadNode);
};
