module.exports = function (RED) {
  function McpToolCallNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.server = RED.nodes.getNode(config.server);
    this.toolName = config.toolName || '';

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      if (!node.server) {
        done(new Error('No MCP server configured'));
        return;
      }

      // Tool name: from node config, or msg.topic, or msg.tool
      var toolName = node.toolName || msg.topic || msg.tool;
      if (!toolName) {
        done(new Error('No tool name — set in node config or msg.topic'));
        return;
      }

      // Arguments: from msg.payload (object) or node config
      var args = {};
      if (msg.payload && typeof msg.payload === 'object' && !Array.isArray(msg.payload)) {
        args = msg.payload;
      }

      node.status({ fill: 'blue', shape: 'dot', text: toolName + '...' });

      node.server.connection.callTool(toolName, args).then(function (result) {
        // Extract text content from MCP response
        var content = result.content || [];
        if (Array.isArray(content) && content.length > 0) {
          var texts = content.filter(function (c) { return c.type === 'text'; });
          if (texts.length === 1) {
            try { msg.payload = JSON.parse(texts[0].text); }
            catch (_) { msg.payload = texts[0].text; }
          } else {
            msg.payload = texts.map(function (c) { return c.text; }).join('\n');
          }
        } else {
          msg.payload = result;
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

  RED.nodes.registerType('mcp-tool-call', McpToolCallNode);
};
