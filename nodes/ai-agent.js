module.exports = function (RED) {
  function AiAgentNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.server = RED.nodes.getNode(config.server);
    this.llmConfig = RED.nodes.getNode(config.llmConfig);
    this.systemPrompt = config.systemPrompt || '';
    this.maxIterations = parseInt(config.maxIterations, 10) || 10;
    this.temperature = parseFloat(config.temperature) || 0.3;
    this.maxTokens = parseInt(config.maxTokens, 10) || 4096;

    /**
     * Convert MCP tool definitions to OpenAI function-calling format.
     */
    function mcpToolsToOpenAI(mcpTools) {
      return mcpTools.map(function (t) {
        return {
          type: 'function',
          function: {
            name: t.name,
            description: t.description || '',
            parameters: t.inputSchema || { type: 'object', properties: {} },
          },
        };
      });
    }

    /**
     * Call the OpenAI-compatible LLM API.
     */
    function callLlm(messages, tools, apiKey) {
      var url = node.llmConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      var body = {
        model: node.llmConfig.model,
        messages: messages,
        temperature: node.temperature,
        max_tokens: node.maxTokens,
      };
      if (tools && tools.length > 0) body.tools = tools;

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify(body),
      }).then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (t) {
            throw new Error('LLM API error ' + resp.status + ': ' + t.slice(0, 500));
          });
        }
        return resp.json();
      }).then(function (data) {
        var choice = data.choices && data.choices[0];
        if (!choice) throw new Error('No response from LLM');
        return choice.message;
      });
    }

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      if (!node.server) { done(new Error('No MCP server configured')); return; }
      if (!node.llmConfig) { done(new Error('No LLM provider configured')); return; }

      var apiKey = (node.llmConfig.credentials && node.llmConfig.credentials.apiKey) || '';
      if (!apiKey) { done(new Error('No API key set in LLM config')); return; }

      var userMessage = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload || '');
      if (!userMessage) { done(new Error('No input — send text in msg.payload')); return; }

      node.status({ fill: 'blue', shape: 'dot', text: 'loading tools...' });

      // 1. Fetch available MCP tools
      node.server.connection.listTools().then(function (mcpTools) {
        var openaiTools = mcpToolsToOpenAI(mcpTools);
        node.status({ fill: 'blue', shape: 'dot', text: openaiTools.length + ' tools loaded' });

        // 2. Build initial messages
        var messages = [];
        if (node.systemPrompt) {
          messages.push({ role: 'system', content: node.systemPrompt });
        }
        messages.push({ role: 'user', content: userMessage });

        // 3. Agent loop
        var iteration = 0;
        var toolCallLog = [];

        function agentStep() {
          iteration++;
          if (iteration > node.maxIterations) {
            // Max iterations — return last assistant message
            var lastContent = '';
            for (var i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === 'assistant' && messages[i].content) {
                lastContent = messages[i].content;
                break;
              }
            }
            return Promise.resolve(lastContent || '[Agent reached max iterations]');
          }

          node.status({ fill: 'yellow', shape: 'dot', text: 'thinking (' + iteration + '/' + node.maxIterations + ')...' });

          return callLlm(messages, openaiTools, apiKey).then(function (response) {
            // No tool calls → agent is done
            if (!response.tool_calls || response.tool_calls.length === 0) {
              return response.content || '';
            }

            // Add assistant message with tool calls
            messages.push(response);

            // Execute tool calls sequentially
            var chain = Promise.resolve();
            response.tool_calls.forEach(function (tc) {
              chain = chain.then(function () {
                var toolName = tc.function.name;
                var toolArgs = {};
                try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch (_) { /* empty */ }

                node.status({ fill: 'yellow', shape: 'dot', text: toolName + '...' });

                return node.server.connection.callTool(toolName, toolArgs).then(function (result) {
                  // Extract text from MCP result
                  var content = result.content || [];
                  var text = '';
                  if (Array.isArray(content)) {
                    text = content
                      .filter(function (c) { return c.type === 'text'; })
                      .map(function (c) { return c.text; })
                      .join('\n');
                  }
                  if (!text) text = JSON.stringify(result);

                  toolCallLog.push({ tool: toolName, args: toolArgs, result: text.slice(0, 500) });
                  messages.push({ role: 'tool', tool_call_id: tc.id, content: text });
                }).catch(function (err) {
                  var errMsg = 'Tool error: ' + (err.message || String(err));
                  toolCallLog.push({ tool: toolName, args: toolArgs, error: errMsg });
                  messages.push({ role: 'tool', tool_call_id: tc.id, content: errMsg });
                });
              });
            });

            // Continue agent loop
            return chain.then(function () { return agentStep(); });
          });
        }

        return agentStep().then(function (finalResponse) {
          msg.payload = finalResponse;
          msg.agentLog = toolCallLog;
          msg.iterations = iteration;
          node.status({ fill: 'green', shape: 'dot', text: 'done (' + iteration + ' steps, ' + toolCallLog.length + ' tools)' });
          send(msg);
          done();
        });
      }).catch(function (err) {
        node.status({ fill: 'red', shape: 'ring', text: 'error' });
        done(err);
      });
    });
  }

  RED.nodes.registerType('ai-agent', AiAgentNode);
};
