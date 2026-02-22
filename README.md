# node-red-contrib-mcp

**Connect AI agents to any MCP server — directly from Node-RED.**

[![npm version](https://img.shields.io/npm/v/node-red-contrib-mcp)](https://www.npmjs.com/package/node-red-contrib-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node-RED](https://img.shields.io/badge/Node--RED-3.0+-red)](https://nodered.org)

MCP (Model Context Protocol) is the open standard for connecting AI models to external tools and data. This package brings MCP to Node-RED — the world's most popular low-code platform for industrial automation, IoT, and event-driven workflows.

**Build AI agents visually. No code required.**

## Nodes

| Node | Description |
|------|-------------|
| **mcp server** | Config node — connect to any MCP server (HTTP or SSE transport) |
| **llm config** | Config node — configure any OpenAI-compatible LLM (OpenAI, Anthropic, Ollama, vLLM, LiteLLM) |
| **mcp tool** | Call a specific MCP tool with arguments |
| **mcp tools** | List all available tools from an MCP server |
| **mcp resource** | Read a resource from an MCP server |
| **llm call** | Send a prompt to an LLM and get a response |
| **ai agent** | Autonomous agent loop — LLM + MCP tools in a reasoning loop |

## Install

```bash
cd ~/.node-red
npm install node-red-contrib-mcp
```

Or search for `node-red-contrib-mcp` in the Node-RED palette manager.

## Quick Start

### 1. Call an MCP tool

```
[inject] → [mcp tool] → [debug]
```

Configure the **mcp tool** node with your MCP server URL and tool name. Send arguments as `msg.payload`.

### 2. AI Agent with MCP tools

```
[inject "What is the OEE of CNC-001?"] → [ai agent] → [debug]
```

The **ai agent** node connects an LLM to your MCP tools. It automatically:
1. Discovers available tools from the MCP server
2. Sends your question to the LLM
3. Executes tool calls decided by the LLM
4. Feeds results back to the LLM
5. Repeats until the LLM has a final answer

### 3. Multi-step pipeline

```
[inject] → [mcp tool "get_oee"] → [llm call "Analyze this OEE data"] → [mcp tool "create_report"] → [debug]
```

Chain MCP tools and LLM calls for complex workflows.

## Configuration

### MCP Server

| Field | Description |
|-------|-------------|
| URL | MCP server endpoint (e.g., `http://localhost:8080/mcp`) |
| Transport | `Streamable HTTP` (recommended) or `SSE` (legacy) |
| API Key | Optional Bearer token for authentication |

### LLM Provider

| Field | Description |
|-------|-------------|
| Base URL | OpenAI-compatible API URL (e.g., `https://api.openai.com/v1`) |
| Model | Model name (e.g., `gpt-4o`, `claude-sonnet-4-20250514`, `llama3`) |
| API Key | Your LLM API key |

**Tested with:** OpenAI, Anthropic (via LiteLLM), Ollama, vLLM, Azure OpenAI, Google Gemini (via proxy)

## Use Cases

- **Manufacturing AI** — Connect to factory MCP servers for OEE monitoring, capacity planning, quality management
- **IoT + AI** — Combine MQTT data with AI reasoning via MCP tools
- **Document Processing** — Use MCP tools to extract, transform, and analyze documents
- **Database Agents** — Let AI query databases through MCP-wrapped data sources
- **DevOps Automation** — AI agents that monitor and act on infrastructure via MCP

## Example: OpenShopFloor

[OpenShopFloor](https://github.com/BavarianAnalyst/openshopfloor) provides **91 free MCP tools** for manufacturing AI — ERP, OEE, quality management, warehouse management, and more. Connect these nodes to OpenShopFloor's MCP servers for a complete factory AI playground.

```
MCP Server URL: http://your-osf-server:8021/mcp   (ERP)
MCP Server URL: http://your-osf-server:8024/mcp   (Production/OEE)
MCP Server URL: http://your-osf-server:8023/mcp   (Quality)
MCP Server URL: http://your-osf-server:8022/mcp   (Warehouse)
```

## Requirements

- Node-RED >= 3.0.0
- Node.js >= 18.0.0

## Contributing

Issues and PRs welcome at [github.com/BavarianAnalyst/node-red-contrib-mcp](https://github.com/BavarianAnalyst/node-red-contrib-mcp).

## License

[Apache-2.0](LICENSE) — use it anywhere, commercially or not.

---

Built by [OpenShopFloor](https://openshopfloor.zeroguess.ai) — the open-source AI platform for factory operations.
