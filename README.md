# Acphast

**Agent Client Protocol Heterogeneous Adapter Streaming Transceiver**

Universal LLM protocol bridge with bidirectional support. Bridge between different protocols (ACP, Pi RPC) and route to any backend (Anthropic, OpenAI, Pi, or other agents) while preserving provider-specific features.

## 🎯 Current Status

**Core Features: Complete** ✅

✅ **Implemented:**
- Core type system (ACP protocol, pipeline types)
- Node-based architecture (Rete.js)
- Graph engine with hot-reload
- Multi-protocol transport (ACP stdio, ACP HTTP+SSE, **Pi RPC stdio**)
- Three adapter pipelines: Anthropic, OpenAI, **Pi**
- Session management
- Bidirectional protocol bridging

🔄 **Optional Enhancements:**
- Full Rete.js visual editor integration
- Test suite
- Additional adapters

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

Acphast supports three transport modes:

**Option 1: ACP over stdio (default)**
```bash
pnpm --filter @acphast/cli start
# Speaks ACP JSON-RPC over stdin/stdout
```

**Option 2: ACP over HTTP+SSE**
```bash
TRANSPORT=http ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start
# HTTP server on port 6809 with Server-Sent Events for streaming
```

**Option 3: Pi RPC over stdio (NEW)**
```bash
pnpm --filter @acphast/cli start --pi-rpc
# Speaks Pi's JSON-RPC protocol - drop-in Pi replacement
# Routes Pi commands to any backend (Anthropic, OpenAI, etc.)
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

### System Overview

```mermaid
init: {"theme":"base","themeVariables":{"primaryTextColor":"#000000","secondaryTextColor":"#000000","tertiaryTextColor":"#000000","noteTextColor":"#000000","primaryColor":"#909090","secondaryColor":"#808080","tertiaryColor":"#707070","lineColor":"#404040","actorLineColor":"#404040","signalColor":"#404040"}}
graph TB
    Client["Client Application"]
    Transport["Transport Layer<br/>stdio | HTTP | Pi RPC"]
    Engine["Graph Engine<br/>Rete.js"]
    Nodes["Node Pipeline<br/>Translator → Client → Normalizer"]
    Backends["Backends<br/>Anthropic | OpenAI | Pi"]
    
    Client -->|JSON-RPC| Transport
    Transport -->|Observable Stream| Engine
    Engine -->|RxJS Pipeline| Nodes
    Nodes -->|API Calls| Backends
    Backends -->|Streaming Response| Nodes
    Nodes -->|Observable| Engine
    Engine -->|JSON-RPC| Transport
    Transport -->|Response| Client
```

### Transport Modes

```mermaid
init: {"theme":"base","themeVariables":{"primaryTextColor":"#000000","secondaryTextColor":"#000000","tertiaryTextColor":"#000000","noteTextColor":"#000000","primaryColor":"#909090","secondaryColor":"#808080","tertiaryColor":"#707070","lineColor":"#404040","actorLineColor":"#404040","signalColor":"#404040"}}
graph LR
    subgraph "ACP Stdio"
        A1["Client"] -->|"ACP JSON-RPC"| A2["stdin"]
        A2 --> A3["Acphast"]
        A3 --> A4["stdout"]
        A4 -->|"ACP JSON-RPC"| A1
    end
    
    subgraph "ACP HTTP+SSE"
        B1["Browser"] -->|"POST /rpc"| B2["HTTP Server"]
        B2 --> B3["Acphast"]
        B3 -->|"SSE /events/:id"| B1
    end
    
    subgraph "Pi RPC Stdio"
        C1["Pi Client"] -->|"Pi JSON-RPC"| C2["stdin"]
        C2 --> C3["Acphast<br/>(Pi Transport)"]
        C3 --> C4["stdout"]
        C4 -->|"Pi JSON-RPC"| C1
    end
```

### Node Pipeline Architecture

```mermaid
init: {"theme":"base","themeVariables":{"primaryTextColor":"#000000","secondaryTextColor":"#000000","tertiaryTextColor":"#000000","noteTextColor":"#000000","primaryColor":"#909090","secondaryColor":"#808080","tertiaryColor":"#707070","lineColor":"#404040","actorLineColor":"#404040","signalColor":"#404040"}}
graph LR
    Request["ACP Request"] --> Trans["Translator Node<br/>ACP → Backend Format"]
    Trans --> Client["Client Node<br/>Call API + Stream Events"]
    Client --> Norm["Normalizer Node<br/>Backend → ACP Format"]
    Norm --> Response["ACP Response"]
    
    style Trans fill:#808080,color:#000000
    style Client fill:#808080,color:#000000
    style Norm fill:#808080,color:#000000
```

**Available Pipelines:**
- **Anthropic**: `AnthropicTranslator → AnthropicClient → ResponseNormalizer`
- **OpenAI**: `OpenAITranslator → OpenAIClient → OpenAINormalizer`
- **Pi**: `PiTranslator → PiClient → PiNormalizer`

### Pi Integration Architecture

```mermaid
init: {"theme":"base","themeVariables":{"primaryTextColor":"#000000","secondaryTextColor":"#000000","tertiaryTextColor":"#000000","noteTextColor":"#000000","primaryColor":"#909090","secondaryColor":"#808080","tertiaryColor":"#707070","lineColor":"#404040","actorLineColor":"#404040","signalColor":"#404040"}}
graph TB
    subgraph "Input: Pi RPC → Acphast"
        I1["Pi RPC Client"] -->|"Pi JSON-RPC stdin"| I2["PiRpcTransport"]
        I2 -->|"Convert to ACP"| I3["Acphast Engine"]
        I3 -->|"Route to Backend"| I4["Anthropic/OpenAI/etc"]
    end
    
    subgraph "Output: Acphast → Pi RPC"
        O1["Acphast Engine"] -->|"ACP Request"| O2["PiTranslator"]
        O2 --> O3["PiClient"]
        O3 -->|"Spawn pi --mode rpc"| O4["Pi Process"]
        O4 -->|"JSON-RPC stdio"| O3
        O3 --> O5["PiNormalizer"]
        O5 -->|"ACP Response"| O1
    end
```

**Bidirectional Support:**
- **Input**: Accept Pi RPC commands, route to any backend
- **Output**: Call Pi as a backend via its RPC interface

### Node Class Hierarchy

```mermaid
init: {"theme":"base","themeVariables":{"primaryTextColor":"#000000","secondaryTextColor":"#000000","tertiaryTextColor":"#000000","noteTextColor":"#000000","primaryColor":"#909090","secondaryColor":"#808080","tertiaryColor":"#707070","lineColor":"#404040","actorLineColor":"#404040","signalColor":"#404040"}}
classDiagram
    AcphastNode <|-- StreamingNode
    AcphastNode <|-- RouterNode
    AcphastNode : +process(inputs, ctx)
    AcphastNode : +validate()
    AcphastNode : +onAdded()
    AcphastNode : +onRemoved()
    
    StreamingNode : +processStream(message, ctx)
    StreamingNode : +sendUpdate(ctx, update)
    
    StreamingNode <|-- AnthropicClientNode
    StreamingNode <|-- OpenAIClientNode
    StreamingNode <|-- PiClientNode
    
    AcphastNode <|-- TranslatorNode
    TranslatorNode <|-- AnthropicTranslatorNode
    TranslatorNode <|-- OpenAITranslatorNode
    TranslatorNode <|-- PiTranslatorNode
```

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

## 💎 Pi Integration Examples

### Drop-in Pi Replacement

Run Acphast as a Pi replacement that routes to Anthropic:

```bash
# Start Acphast in Pi RPC mode
ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start --pi-rpc

# In another terminal, send Pi RPC commands
echo '{"type":"prompt","id":"1","message":"Hello!"}' | nc localhost -
```

### Call Pi from Acphast

Use Pi as a backend in an Acphast pipeline:

```typescript
import { PiTranslatorNode, PiClientNode, PiNormalizerNode } from '@acphast/nodes';

const pipeline = [
  new PiTranslatorNode({ 
    defaultThinkingLevel: 'high',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022'
  }),
  new PiClientNode({ 
    cwd: '/path/to/project',
    sessionPath: './session.json'
  }),
  new PiNormalizerNode()
];
```

### Protocol Bridging

Accept Pi RPC, route to OpenAI:

```bash
# Configure Acphast to use OpenAI backend
OPENAI_API_KEY=sk-... pnpm --filter @acphast/cli start --pi-rpc

# Pi clients now talk to OpenAI instead!
```

## 🗺️ Roadmap

### Core Features ✅ COMPLETE
- [x] Multi-protocol transport (ACP stdio, HTTP, Pi RPC)
- [x] Three adapter pipelines (Anthropic, OpenAI, Pi)
- [x] Bidirectional protocol bridging
- [x] Graph engine with hot-reload
- [x] Session management

### Optional Enhancements
- [ ] Visual graph editor (Rete.js UI)
- [ ] Test suite (unit + integration)
- [ ] Additional adapters (Ollama, etc.)
- [ ] Router nodes for conditional routing
- [ ] Config file loading

## 📄 License

MIT

## 🤝 Contributing

This project is in active development. Contributions welcome!

## 📚 Documentation

- [Architecture](docs/RETE-NODE-ARCHITECTURE.md) - Node-based architecture design
- [Specification](docs/ACPHAST-README.md) - Full ACP proxy specification
- [Pi API Module](ACPHAST-PI-API-MODULE.md) - Complete Pi RPC integration specification
- [Implementation Progress](docs/IMPLEMENTATION-PROGRESS.md) - Detailed progress tracker
