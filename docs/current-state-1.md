# Acphast Current State

**Date:** 2026-02-04  
**Version:** MVP (~50% complete)

## What is Acphast?

Acphast (**A**gent **C**lient **P**rotocol **H**eterogeneous **A**dapter **S**treaming **T**ransceiver) is a universal LLM protocol translator. It routes ACP (Agent Client Protocol) requests to various backends (Anthropic, OpenAI, Ollama) without losing provider-specific features.

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients
        C1[ACP Client 1]
        C2[ACP Client 2]
    end

    subgraph Transport["Transport Layer"]
        STDIO[stdio Transport<br/>JSON-RPC 2.0]
        HTTP[HTTP Transport<br/>POST /rpc + SSE]
    end

    subgraph Engine["Acphast Engine"]
        GE[Graph Executor]
        NR[Node Registry]
        HR[Hot Reload]
    end

    subgraph Graph["Rete.js Dataflow Graph"]
        direction LR
        IN[Input] --> ROUTER[Router]
        ROUTER --> ANTH[Anthropic<br/>Adapter]
        ROUTER --> OAI[OpenAI<br/>Adapter]
        ROUTER --> PASS[ACP<br/>Passthrough]
    end

    subgraph Backends
        CLAUDE[Claude API]
        GPT[OpenAI API]
        AGENT[Other ACP Agent]
    end

    C1 --> STDIO
    C2 --> HTTP
    STDIO --> Engine
    HTTP --> Engine
    Engine --> Graph
    ANTH --> CLAUDE
    OAI --> GPT
    PASS --> AGENT
```

## Package Structure

```mermaid
flowchart TD
    subgraph Packages["@acphast/* packages"]
        CORE["@acphast/core<br/>─────────<br/>• ACP types<br/>• Pipeline types<br/>• Error codes"]
        
        NODES["@acphast/nodes<br/>─────────<br/>• Base node classes<br/>• Streaming helpers<br/>• Registry"]
        
        ENGINE["@acphast/engine<br/>─────────<br/>• Rete.js integration<br/>• Graph executor<br/>• Hot reload"]
        
        TRANSPORT["@acphast/transport<br/>─────────<br/>• JSON-RPC<br/>• stdio transport<br/>• HTTP + SSE"]
        
        SESSION["@acphast/session<br/>─────────<br/>• Session repository<br/>• Memory store"]
        
        CONFIG["@acphast/config<br/>─────────<br/>• TOML schema<br/>• Config loader"]
        
        CLI["@acphast/cli<br/>─────────<br/>• Server entry point<br/>• Request handling"]
    end

    CORE --> NODES
    CORE --> ENGINE
    CORE --> TRANSPORT
    CORE --> SESSION
    NODES --> ENGINE
    ENGINE --> CLI
    TRANSPORT --> CLI
    SESSION --> CLI
    CONFIG --> CLI
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Transport as Transport<br/>(stdio/HTTP)
    participant CLI as CLI Server
    participant Engine as Graph Engine
    participant Node as Anthropic Node
    participant API as Claude API

    Client->>Transport: JSON-RPC Request<br/>{method: "acp/messages/create"}
    Transport->>CLI: Emit request via RxJS
    CLI->>CLI: Create PipelineContext
    CLI->>Engine: execute(nodeId, message, ctx)
    Engine->>Node: process(inputs, ctx)
    Node->>API: Anthropic SDK call<br/>(streaming)
    
    loop Streaming
        API-->>Node: Content delta
        Node-->>CLI: ctx.onUpdate()
        CLI-->>Transport: Send notification
        Transport-->>Client: SSE event / stdout
    end
    
    API-->>Node: Stream complete
    Node-->>Engine: Final PipelineMessage
    Engine-->>CLI: Observable completes
    CLI-->>Transport: Send response
    Transport-->>Client: JSON-RPC Response
```

## Node Architecture

All nodes extend the Rete.js `ClassicPreset.Node` and implement a `process()` method that works with RxJS observables:

```mermaid
classDiagram
    class ClassicPreset_Node {
        +id: string
        +label: string
        +inputs: Map
        +outputs: Map
    }

    class AcphastNode {
        <<abstract>>
        +static meta: NodeMetadata
        +config: Record
        #logger: Logger
        +process(inputs, ctx)*
        +validate(): string[]
        +onAdded()
        +onRemoved()
    }

    class StreamingNode {
        <<abstract>>
        +processStream(message, ctx)*
        +process(inputs, ctx)
        #sendUpdate(ctx, update)
    }

    class AnthropicAdapterNode {
        -client: Anthropic
        +processStream(message, ctx)
        -translateRequest()
        -callAnthropic()
    }

    class ACPPassthroughNode {
        +process(inputs, ctx)
    }

    ClassicPreset_Node <|-- AcphastNode
    AcphastNode <|-- StreamingNode
    AcphastNode <|-- ACPPassthroughNode
    StreamingNode <|-- AnthropicAdapterNode
```

## Transport Layer

Two transport implementations handle client communication:

```mermaid
flowchart LR
    subgraph StdioTransport
        direction TB
        STDIN[stdin] --> PARSE1[JSON Parser]
        PARSE1 --> REQ1[requests$ Observable]
        RESP1[Response] --> STDOUT[stdout]
    end

    subgraph HttpTransport
        direction TB
        POST["POST /rpc"] --> PARSE2[JSON Parser]
        PARSE2 --> REQ2[requests$ Observable]
        RESP2[Response] --> JSON[JSON Response]
        
        SSE["GET /events/:id"] --> STREAM[SSE Stream]
        NOTIF[Notifications] --> STREAM
    end
```

## What's Working Now

| Component | Status | Notes |
|-----------|--------|-------|
| Core types | ✅ Complete | ACP protocol, pipeline types, errors |
| Node base classes | ✅ Complete | AcphastNode, StreamingNode |
| Node registry | ✅ Complete | Dynamic node registration |
| Graph engine | ✅ Complete | Rete.js integration, execution |
| Hot reload | ✅ Complete | fs.watch based |
| stdio transport | ✅ Complete | JSON-RPC 2.0 |
| HTTP transport | ✅ Complete | POST + SSE |
| Session management | ✅ Complete | In-memory store |
| ACP Passthrough | ✅ Complete | Simple passthrough node |
| Anthropic adapter | ⚠️ Bug | Request structure mismatch |

## Current Bug

The Anthropic adapter has a request structure mismatch:

```mermaid
flowchart LR
    subgraph "JSON-RPC Envelope"
        E_METHOD["method: 'acp/messages/create'"]
        E_PARAMS["params: {model, messages}"]
    end

    subgraph "CLI Processing"
        CLI_LINE["acpRequest = request.params"]
        CLI_RESULT["acpRequest = {model, messages}"]
    end

    subgraph "Anthropic Node Expects"
        EXPECT["request.params.model ❌"]
        ACTUAL["request.model ✅"]
    end

    E_PARAMS --> CLI_LINE
    CLI_LINE --> CLI_RESULT
    CLI_RESULT --> EXPECT
```

**Fix needed:** The CLI should construct the ACPRequest with both `method` and `params`:

```typescript
const acpRequest = {
  method: request.method,
  params: request.params,
} as ACPRequest;
```

## Graph Definition Format

Graphs are defined as JSON and can be hot-reloaded:

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "Claude Adapter",
    "description": "Direct connection to Anthropic Claude models"
  },
  "nodes": [
    {
      "id": "claude",
      "type": "Anthropic Adapter",
      "config": {
        "defaultModel": "claude-sonnet-4-20250514",
        "maxTokens": 4096
      }
    }
  ],
  "connections": []
}
```

## Next Steps

1. **Fix the request structure bug** in CLI → Anthropic adapter flow
2. **Add OpenAI adapter** node
3. **Implement router nodes** for backend selection
4. **Build visual editor** with full Rete.js integration
5. **Add comprehensive tests**

## Running the Demo

```bash
# Start HTTP server with Claude
TRANSPORT=http ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start

# Open chat interface
open web/chat.html
```
