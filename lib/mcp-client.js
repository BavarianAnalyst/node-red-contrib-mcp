/**
 * MCP Client wrapper — manages connections to MCP servers.
 * Supports Streamable HTTP, SSE (via MCP SDK), and raw JSON-RPC HTTP.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

/**
 * Lightweight JSON-RPC HTTP client for MCP servers that accept
 * plain POST requests. Bypasses the SDK's session/handshake logic.
 */
class JsonRpcClient {
  constructor(url, headers = {}) {
    this.url = url;
    this.headers = headers;
    this._id = 0;
  }

  async request(method, params = {}) {
    this._id++;
    const body = { jsonrpc: '2.0', method, params, id: this._id };

    const resp = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`MCP HTTP ${resp.status}: ${text.slice(0, 500)}`);
    }

    const data = await resp.json();
    if (data.error) {
      throw new Error(`MCP error ${data.error.code}: ${data.error.message}`);
    }
    return data.result;
  }

  async close() { /* stateless */ }
}

class McpConnection {
  constructor(config) {
    this.url = config.url;
    this.transport = config.transport || 'http';
    this.headers = config.headers || {};
    this.client = null;        // MCP SDK Client (for streamable/sse)
    this.jsonRpc = null;       // Raw JSON-RPC client
    this._connecting = null;
  }

  async connect() {
    if (this.client || this.jsonRpc) return;
    if (this._connecting) return this._connecting;

    this._connecting = this._doConnect();
    try {
      await this._connecting;
    } catch (err) {
      this._connecting = null;
      throw err;
    } finally {
      this._connecting = null;
    }
  }

  async _doConnect() {
    if (this.transport === 'sse') {
      const client = new Client(
        { name: 'node-red-contrib-mcp', version: '1.0.0' },
        { capabilities: {} }
      );
      const transport = new SSEClientTransport(new URL(this.url), {
        requestInit: { headers: this.headers },
      });
      await client.connect(transport);
      this.client = client;
    } else if (this.transport === 'json-rpc') {
      this.jsonRpc = new JsonRpcClient(this.url, this.headers);
    } else {
      // Default: try Streamable HTTP, fall back to JSON-RPC
      try {
        const client = new Client(
          { name: 'node-red-contrib-mcp', version: '1.0.0' },
          { capabilities: {} }
        );
        const transport = new StreamableHTTPClientTransport(new URL(this.url), {
          requestInit: { headers: this.headers },
        });
        await client.connect(transport);
        this.client = client;
      } catch (_) {
        this.jsonRpc = new JsonRpcClient(this.url, this.headers);
      }
    }
  }

  async disconnect() {
    if (this.client) {
      try { await this.client.close(); } catch (_) { /* ignore */ }
      this.client = null;
    }
    if (this.jsonRpc) {
      await this.jsonRpc.close();
      this.jsonRpc = null;
    }
  }

  async listTools() {
    await this.connect();
    if (this.jsonRpc) {
      const result = await this.jsonRpc.request('tools/list');
      return result.tools || [];
    }
    const result = await this.client.listTools();
    return result.tools || [];
  }

  async callTool(name, args) {
    await this.connect();
    if (this.jsonRpc) {
      return await this.jsonRpc.request('tools/call', { name, arguments: args || {} });
    }
    return await this.client.callTool({ name, arguments: args || {} });
  }

  async listResources() {
    await this.connect();
    if (this.jsonRpc) {
      const result = await this.jsonRpc.request('resources/list');
      return result.resources || [];
    }
    const result = await this.client.listResources();
    return result.resources || [];
  }

  async readResource(uri) {
    await this.connect();
    if (this.jsonRpc) {
      return await this.jsonRpc.request('resources/read', { uri });
    }
    return await this.client.readResource({ uri });
  }

  async listPrompts() {
    await this.connect();
    if (this.jsonRpc) {
      const result = await this.jsonRpc.request('prompts/list');
      return result.prompts || [];
    }
    const result = await this.client.listPrompts();
    return result.prompts || [];
  }

  async getPrompt(name, args) {
    await this.connect();
    if (this.jsonRpc) {
      return await this.jsonRpc.request('prompts/get', { name, arguments: args || {} });
    }
    return await this.client.getPrompt({ name, arguments: args || {} });
  }
}

module.exports = { McpConnection };
