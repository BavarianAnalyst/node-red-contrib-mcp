/**
 * MCP Client wrapper — manages connections to MCP servers.
 * Supports Streamable HTTP and SSE transports.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

class McpConnection {
  constructor(config) {
    this.url = config.url;
    this.transport = config.transport || 'http';
    this.headers = config.headers || {};
    this.client = null;
    this._connecting = null;
  }

  async connect() {
    if (this.client) return this.client;
    if (this._connecting) return this._connecting;

    this._connecting = this._doConnect();
    try {
      this.client = await this._connecting;
      return this.client;
    } catch (err) {
      this._connecting = null;
      throw err;
    } finally {
      this._connecting = null;
    }
  }

  async _doConnect() {
    const client = new Client(
      { name: 'node-red-contrib-mcp', version: '1.0.0' },
      { capabilities: {} }
    );

    let transport;
    const url = new URL(this.url);

    if (this.transport === 'sse') {
      transport = new SSEClientTransport(url, {
        requestInit: { headers: this.headers },
      });
    } else {
      transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers: this.headers },
      });
    }

    await client.connect(transport);
    return client;
  }

  async disconnect() {
    if (this.client) {
      try { await this.client.close(); } catch (_) { /* ignore */ }
      this.client = null;
    }
  }

  async listTools() {
    const client = await this.connect();
    const result = await client.listTools();
    return result.tools || [];
  }

  async callTool(name, args) {
    const client = await this.connect();
    const result = await client.callTool({ name, arguments: args || {} });
    return result;
  }

  async listResources() {
    const client = await this.connect();
    const result = await client.listResources();
    return result.resources || [];
  }

  async readResource(uri) {
    const client = await this.connect();
    const result = await client.readResource({ uri });
    return result;
  }

  async listPrompts() {
    const client = await this.connect();
    const result = await client.listPrompts();
    return result.prompts || [];
  }

  async getPrompt(name, args) {
    const client = await this.connect();
    const result = await client.getPrompt({ name, arguments: args || {} });
    return result;
  }
}

module.exports = { McpConnection };
