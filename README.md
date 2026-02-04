# Acphast

**Agent Client Protocol Heterogeneous Adapter Streaming Transceiver**

Universal LLM protocol translator with visual graph editing. Route ACP requests to any backend (Anthropic, OpenAI, Ollama, or other ACP agents) without losing provider-specific features.

## 🎯 Current Status

**MVP Progress: ~50% Complete**

✅ **Phase 1-4 Complete:**
- Core type system (ACP protocol, pipeline types)
- Node-based architecture (Rete.js)
- Graph engine with hot-reload
- Transport layer (stdio JSON-RPC)
- CLI server with graph execution
- Session management

🔄 **In Progress:**
- Additional node implementations (Anthropic, OpenAI adapters)
- Full Rete.js visual editor integration
- HTTP transport with SSE

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build
```

### Run the Server

**Option 1: stdio (for CLI tools)**
```bash
pnpm --filter @acphast/cli start
```

**Option 2: HTTP (for web apps)**
```bash
# Start HTTP server on port 6809
TRANSPORT=http pnpm --filter @acphast/cli start

# Or with Anthropic API key
TRANSPORT=http ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start
```

### Try the Web Chat Demo

1. Start the HTTP server:
```bash
TRANSPORT=http ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start
```

2. Open the chat interface:
```bash
open web/chat.html
```

3. Chat with Claude in your browser!

### View the Status Dashboard

```bash
open web/index.html
```

Shows project progress, architecture, and available nodes.

## 📦 Project Structure

```
acphast/
├── packages/
│   ├── core/         # Core types (ACP, pipeline, metadata)
│   ├── config/       # TOML configuration system
│   ├── nodes/        # Base node classes & registry
│   ├── engine/       # Rete.js graph execution engine
│   ├── transport/    # JSON-RPC transport (stdio, HTTP)
│   ├── session/      # Session management
│   └── cli/          # CLI server application
├── web/              # Visual graph editor (preview)
└── docs/             # Architecture & specs
```

## 🏗️ Architecture

### Node-Based Pipeline

All components are **visual Rete nodes** that process **RxJS observables**:

```
ACPReceiver → Router → [Adapters] → Responder
                 │
         ┌───────┼───────┐
         ▼       ▼       ▼
     Anthropic OpenAI  Ollama
```

### Node Types

- **AcphastNode**: Base class with `process()` method
- **StreamingNode**: For LLM adapters with streaming
- **RouterNode**: Conditional routing logic

### Transport

- **Stdio**: Line-delimited JSON-RPC over stdin/stdout (✅ Complete)
- **HTTP**: POST `/rpc` + SSE `/events/:id` (⏳ In progress)

## 🎨 Current Graph

The default graph is a simple passthrough that processes requests through the Rete.js engine:

```json
{
  "nodes": [
    { "id": "passthrough", "type": "ACPPassthrough" }
  ],
  "connections": []
}
```

## 📝 Example Request

```json
{
  "jsonrpc": "2.0",
  "method": "acp/messages/create",
  "params": {
    "model": "claude-sonnet-4",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  },
  "id": 1
}
```

## 🔧 Development

### Build

```bash
# Build all packages
pnpm -r build

# Build specific package
pnpm --filter @acphast/cli build

# Watch mode
pnpm --filter @acphast/cli dev
```

### Test

```bash
# Run tests (coming soon)
pnpm test
```

### Debug

Set `LOG_LEVEL=debug` to see detailed logging:

```bash
LOG_LEVEL=debug pnpm --filter @acphast/cli start
```

All logs go to stderr (stdout is reserved for JSON-RPC).

## 📊 Statistics

- **Packages**: 7
- **Lines of Code**: ~6,000+
- **Build Time**: ~2.5s
- **Node Types**: 1 (ACPPassthrough, more coming)

## 🗺️ Roadmap

### Phase 5: Additional Nodes (20% complete)
- [ ] Anthropic adapter
- [ ] OpenAI adapter  
- [ ] Router nodes
- [x] ACP passthrough

### Phase 6: CLI Enhancements
- [x] Basic server with graph execution
- [ ] Command-line arguments
- [ ] Config file loading
- [ ] Multiple transport modes

### Phase 7: Visual Editor (0%)
- [ ] Full Rete.js integration
- [ ] Drag-and-drop node creation
- [ ] Live graph editing
- [ ] Node configuration UI

### Phase 8: Testing & Docs
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation
- [ ] User guides

## 📄 License

MIT

## 🤝 Contributing

This project is in active development. Contributions welcome!

## 📚 Documentation

- [Architecture](docs/RETE-NODE-ARCHITECTURE.md) - Node-based architecture design
- [Specification](docs/ACPHAST-README.md) - Full ACP proxy specification
- [Implementation Progress](docs/IMPLEMENTATION-PROGRESS.md) - Detailed progress tracker
