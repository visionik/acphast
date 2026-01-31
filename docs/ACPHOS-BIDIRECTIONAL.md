# Acphos Bidirectional Architecture

**Universal LLM Protocol Translator**

## Overview

Acphos is a bidirectional protocol translator with two complementary halves:

- **acphos-front**: Ingests any LLM interface format → converts to internal ACP
- **acphos-back**: Takes internal ACP → outputs to any LLM interface format

This enables any-to-any protocol translation through a unified ACP core.

```
                           ACPHOS
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌──────────────────┐              ┌──────────────────┐        │
│   │   acphos-front   │              │   acphos-back    │        │
│   │                  │              │                  │        │
│   │  Ingest any      │     ACP      │  Output to any   │        │
│   │  protocol        │ ──────────►  │  protocol        │        │
│   │                  │   (core)     │                  │        │
│   └──────────────────┘              └──────────────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         ▲                                        │
         │                                        ▼
    ┌─────────┐                              ┌─────────┐
    │ Client  │                              │ Backend │
    │ Request │                              │   LLM   │
    └─────────┘                              └─────────┘
```

---

## Supported Protocols

| Protocol | acphos-front (Ingest) | acphos-back (Output) |
|----------|----------------------|---------------------|
| **ACP** (Agent Client Protocol) | ✅ | ✅ |
| **Anthropic Messages API** | ✅ | ✅ |
| **OpenAI Responses API** | ✅ | ✅ |
| **OpenAI Chat Completions** | ✅ | ✅ |
| **Claude Code / Tools** | ✅ | ✅ |
| **Ollama** | ✅ | ✅ |
| **WebSocket (Proprietary)** | ✅ | ✅ |

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    ACPHOS                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           acphos-front                                   │    │
│  │                                                                          │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │    │
│  │  │  Messages   │ │  Responses  │ │ Chat Compl. │ │   Custom    │        │    │
│  │  │  Receiver   │ │  Receiver   │ │  Receiver   │ │  Receiver   │        │    │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘        │    │
│  │         │               │               │               │               │    │
│  │         └───────────────┴───────┬───────┴───────────────┘               │    │
│  │                                 │                                        │    │
│  │                                 ▼                                        │    │
│  │                     ┌───────────────────────┐                            │    │
│  │                     │   Front Normalizer    │                            │    │
│  │                     │   (→ Internal ACP)    │                            │    │
│  │                     └───────────┬───────────┘                            │    │
│  └─────────────────────────────────┼────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                              ACP Core                                    │    │
│  │                                                                          │    │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │    │
│  │   │ Capability   │  │   Backend    │  │    Meta      │                  │    │
│  │   │   Router     │  │   Selector   │  │  Processor   │                  │    │
│  │   └──────────────┘  └──────────────┘  └──────────────┘                  │    │
│  │                                                                          │    │
│  └─────────────────────────────────┬────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           acphos-back                                    │    │
│  │                                                                          │    │
│  │                     ┌───────────────────────┐                            │    │
│  │                     │   Back Denormalizer   │                            │    │
│  │                     │   (ACP → Target)      │                            │    │
│  │                     └───────────┬───────────┘                            │    │
│  │                                 │                                        │    │
│  │         ┌───────────────────────┼───────────────────────┐               │    │
│  │         │               │               │               │               │    │
│  │  ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐        │    │
│  │  │  Anthropic  │ │   OpenAI    │ │   Ollama    │ │    ACP      │        │    │
│  │  │   Adapter   │ │   Adapter   │ │   Adapter   │ │  Passthru   │        │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Example Chains

### 1. OpenAI-Compatible API → Claude

Expose an OpenAI-compatible endpoint, route to Anthropic Claude:

```
Client (OpenAI SDK)
       │
       │  POST /v1/chat/completions
       ▼
┌─────────────────┐
│  acphos-front   │
│  Chat Compl.    │──────► Internal ACP
│  Receiver       │
└─────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │    ACP Core      │
                   │  Route: anthropic│
                   └──────────────────┘
                              │
                              ▼
                   ┌─────────────────┐
                   │  acphos-back    │
                   │  Anthropic      │──────► api.anthropic.com
                   │  Adapter        │
                   └─────────────────┘
```

**Use case:** Drop-in replacement for OpenAI with Claude backend.

---

### 2. Messages API → Claude Code Style

Accept Anthropic Messages API, but use Claude Code tool patterns:

```
Client (Anthropic SDK)
       │
       │  POST /v1/messages
       ▼
┌─────────────────┐
│  acphos-front   │
│  Messages       │──────► Internal ACP
│  Receiver       │
└─────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │    ACP Core      │
                   │  Inject: tools   │
                   │  Route: anthropic│
                   └──────────────────┘
                              │
                              ▼
                   ┌─────────────────┐
                   │  acphos-back    │
                   │  Claude Code    │──────► Claude w/ structured tools
                   │  Adapter        │
                   └─────────────────┘
```

**Use case:** Add Claude Code tooling patterns to raw Messages API calls.

---

### 3. Claude Code → Local Ollama

Run Claude Code-style agent against local Ollama:

```
IDE / Editor
       │
       │  ACP (stdio)
       ▼
┌─────────────────┐
│  acphos-front   │
│  ACP            │──────► Internal ACP
│  Receiver       │
└─────────────────┘
                              │
                              ▼
                   ┌──────────────────┐
                   │    ACP Core      │
                   │  Route: ollama   │
                   └──────────────────┘
                              │
                              ▼
                   ┌─────────────────┐
                   │  acphos-back    │
                   │  Ollama         │──────► localhost:11434
                   │  Adapter        │
                   └─────────────────┘
```

**Use case:** Use Claude Code interface with free local models.

---

### 4. Responses API → Anthropic Messages

Accept OpenAI Responses API format, route to Claude:

```
Client (OpenAI SDK - Responses)
       │
       │  POST /v1/responses
       ▼
┌─────────────────┐
│  acphos-front   │
│  Responses      │──────► Internal ACP
│  Receiver       │          │
└─────────────────┘          │
                              │  Translate:
                              │  - reasoning → thinking
                              │  - web_search → (drop or MCP)
                              ▼
                   ┌──────────────────┐
                   │    ACP Core      │
                   │  Route: anthropic│
                   └──────────────────┘
                              │
                              ▼
                   ┌─────────────────┐
                   │  acphos-back    │
                   │  Anthropic      │──────► api.anthropic.com
                   │  Messages       │
                   └─────────────────┘
```

**Use case:** Migrate from OpenAI to Anthropic without changing client code.

---

### 5. Chain: ACP → ACP → Backend

Multi-hop through another ACP agent:

```
IDE
 │
 │  ACP
 ▼
┌───────────────┐      ACP       ┌───────────────┐
│   Acphos A    │ ─────────────► │   Acphos B    │ ────► Claude API
│   (Router)    │                │   (Backend)   │
└───────────────┘                └───────────────┘
```

**Use case:** Distributed agent routing, load balancing, or capability sharding.

---

## Module Structure

```
acphos/
├── packages/
│   ├── core/                    # Shared types, ACP definitions
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── acp.ts
│   │   │   └── meta.ts
│   │   └── package.json
│   │
│   ├── front/                   # acphos-front: Ingest protocols → ACP
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── receivers/
│   │   │   │   ├── acp.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── responses.ts
│   │   │   │   ├── chat-completions.ts
│   │   │   │   └── websocket.ts
│   │   │   └── normalizer.ts
│   │   └── package.json
│   │
│   ├── back/                    # acphos-back: ACP → Output protocols
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── adapters/
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── ollama.ts
│   │   │   │   ├── acp.ts
│   │   │   │   └── websocket.ts
│   │   │   └── denormalizer.ts
│   │   └── package.json
│   │
│   ├── graph/                   # Rete.js graph engine
│   │   ├── src/
│   │   │   ├── engine.ts
│   │   │   ├── nodes/
│   │   │   └── sockets.ts
│   │   └── package.json
│   │
│   └── server/                  # HTTP/stdio server
│       ├── src/
│       │   ├── index.ts
│       │   ├── http.ts
│       │   └── stdio.ts
│       └── package.json
│
├── apps/
│   ├── proxy/                   # Main proxy application
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   └── visual-editor/           # Optional Rete.js UI
│       ├── src/
│       └── package.json
│
├── package.json                 # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## Receiver Nodes (acphos-front)

### Messages API Receiver

```typescript
// packages/front/src/receivers/messages.ts

import { Hono } from 'hono';
import type { ACPRequest, PipelineMessage } from '@acphos/core';

export class MessagesReceiver {
  private app: Hono;
  private onMessage: (msg: PipelineMessage) => Promise<void>;
  
  constructor(onMessage: (msg: PipelineMessage) => Promise<void>) {
    this.onMessage = onMessage;
    this.app = new Hono();
    this.setupRoutes();
  }
  
  private setupRoutes() {
    this.app.post('/v1/messages', async (c) => {
      const body = await c.req.json();
      
      // Translate Anthropic Messages → Internal ACP
      const acpRequest = this.translateToACP(body);
      
      // Stream response
      return c.stream(async (stream) => {
        await this.onMessage({
          ctx: this.createContext(stream),
          request: acpRequest,
        });
      });
    });
  }
  
  private translateToACP(body: AnthropicMessagesRequest): ACPRequest {
    return {
      id: crypto.randomUUID(),
      method: 'session/prompt',
      params: {
        sessionId: body.metadata?.session_id ?? crypto.randomUUID(),
        prompt: this.translateContent(body.messages),
        _meta: {
          anthropic: {
            model: body.model,
            maxTokens: body.max_tokens,
            thinking: body.thinking,
            system: body.system,
          },
        },
      },
    };
  }
  
  private translateContent(messages: any[]): ContentBlock[] {
    // Convert Anthropic message format to ACP ContentBlocks
    return messages.flatMap(msg => 
      msg.content.map(block => this.translateBlock(block))
    );
  }
  
  private translateBlock(block: any): ContentBlock {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };
      case 'image':
        return { 
          type: 'image', 
          data: block.source.data,
          mimeType: block.source.media_type,
        };
      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        };
      default:
        return { type: 'text', text: JSON.stringify(block) };
    }
  }
}
```

### Responses API Receiver

```typescript
// packages/front/src/receivers/responses.ts

export class ResponsesReceiver {
  private app: Hono;
  
  private translateToACP(body: OpenAIResponsesRequest): ACPRequest {
    return {
      id: crypto.randomUUID(),
      method: 'session/prompt',
      params: {
        sessionId: body.session_id ?? crypto.randomUUID(),
        prompt: this.translateInput(body.input),
        _meta: {
          openai: {
            model: body.model,
            reasoning: body.reasoning,
            tools: body.tools,
          },
          // Map OpenAI reasoning → thinking in meta
          proxy: {
            translateReasoning: body.reasoning ? 'thinking' : undefined,
          },
        },
      },
    };
  }
  
  private translateInput(input: ResponseInputItem[]): ContentBlock[] {
    return input.flatMap(item => {
      if (item.type === 'message') {
        return item.content.map(c => this.translateContent(c));
      }
      return [];
    });
  }
}
```

### Chat Completions Receiver

```typescript
// packages/front/src/receivers/chat-completions.ts

export class ChatCompletionsReceiver {
  private app: Hono;
  
  constructor() {
    this.app = new Hono();
    
    // OpenAI-compatible endpoint
    this.app.post('/v1/chat/completions', async (c) => {
      const body = await c.req.json();
      const acpRequest = this.translateToACP(body);
      // ... process
    });
  }
  
  private translateToACP(body: ChatCompletionsRequest): ACPRequest {
    return {
      id: crypto.randomUUID(),
      method: 'session/prompt',
      params: {
        sessionId: crypto.randomUUID(),
        prompt: this.translateMessages(body.messages),
        _meta: {
          openai: {
            model: body.model,
            temperature: body.temperature,
            tools: body.tools,
            responseFormat: body.response_format,
          },
        },
      },
    };
  }
  
  private translateMessages(messages: ChatMessage[]): ContentBlock[] {
    return messages.map(msg => ({
      type: 'text',
      text: typeof msg.content === 'string' 
        ? msg.content 
        : msg.content.map(c => c.text).join('\n'),
      _meta: { role: msg.role },
    }));
  }
}
```

---

## Adapter Nodes (acphos-back)

### Response Format Adapters

Each adapter must implement bidirectional streaming:

```typescript
// packages/back/src/adapters/base.ts

export interface BackendAdapter {
  readonly id: string;
  readonly name: string;
  
  // Check if this adapter can handle the request
  canHandle(request: ACPRequest): boolean;
  
  // Get capabilities
  getCapabilities(): BackendCapabilities;
  
  // Process request with streaming
  process(
    request: ACPRequest,
    onUpdate: (notification: ACPNotification) => void,
  ): Promise<ACPResponse>;
}
```

### Response Format Translator

```typescript
// packages/back/src/denormalizer.ts

export class ResponseDenormalizer {
  
  // ACP updates → Anthropic SSE format
  toAnthropicSSE(notification: ACPNotification): string {
    const update = notification.params?.update;
    
    switch (update?.type) {
      case 'content_chunk':
        return this.formatSSE('content_block_delta', {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: update.content.text },
        });
        
      case 'thought_chunk':
        return this.formatSSE('content_block_delta', {
          type: 'content_block_delta', 
          delta: { type: 'thinking_delta', thinking: update.content.text },
        });
        
      case 'tool_call':
        return this.formatSSE('content_block_start', {
          type: 'content_block_start',
          content_block: {
            type: 'tool_use',
            id: update.toolCall.id,
            name: update.toolCall.name,
          },
        });
    }
    
    return '';
  }
  
  // ACP updates → OpenAI SSE format
  toOpenAISSE(notification: ACPNotification): string {
    const update = notification.params?.update;
    
    switch (update?.type) {
      case 'content_chunk':
        return this.formatSSE('response.output_text.delta', {
          type: 'response.output_text.delta',
          delta: update.content.text,
        });
        
      case 'thought_chunk':
        return this.formatSSE('response.reasoning_summary_text.delta', {
          type: 'response.reasoning_summary_text.delta',
          delta: update.content.text,
        });
    }
    
    return '';
  }
  
  private formatSSE(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }
}
```

---

## Configuration

```toml
# acphos.toml

[server]
host = "0.0.0.0"
port = 8080

# Which frontends to enable
[front]
acp_stdio = true
messages_api = true      # POST /v1/messages
responses_api = true     # POST /v1/responses  
chat_completions = true  # POST /v1/chat/completions

# Backend routing
[back]
default = "anthropic"

[back.anthropic]
enabled = true
api_key_env = "ANTHROPIC_API_KEY"
default_model = "claude-sonnet-4-20250514"

[back.openai]
enabled = true
api_key_env = "OPENAI_API_KEY"
default_model = "gpt-4.1"

[back.ollama]
enabled = true
base_url = "http://localhost:11434"
default_model = "llama3.1:8b"

[back.acp]
enabled = true
targets = [
  { name = "claude-code", command = ["claude-code", "--stdio"] },
  { name = "codex", command = ["codex-acp"] },
]

# Routing rules
[[routing.rules]]
match = { meta_backend = "anthropic" }
target = "anthropic"

[[routing.rules]]
match = { meta_thinking = true }
target = "anthropic"

[[routing.rules]]
match = { meta_reasoning = true }
target = "openai"

[[routing.rules]]
match = { model_prefix = "gpt-" }
target = "openai"

[[routing.rules]]
match = { model_prefix = "claude-" }
target = "anthropic"

# Default fallback
[[routing.rules]]
match = { always = true }
target = "anthropic"
```

---

## Rete.js Graph Integration

The graph engine connects front receivers to back adapters:

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Rete.js Graph                                 │
│                                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐ │
│  │  Messages   │   │  Responses  │   │  Chat       │   │    ACP      │ │
│  │  Receiver   │   │  Receiver   │   │  Completions│   │  Receiver   │ │
│  │    Node     │   │    Node     │   │    Node     │   │    Node     │ │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘ │
│         │                 │                 │                 │        │
│         └─────────────────┴────────┬────────┴─────────────────┘        │
│                                    │                                    │
│                                    ▼                                    │
│                         ┌──────────────────┐                            │
│                         │   Normalizer     │                            │
│                         │      Node        │                            │
│                         └────────┬─────────┘                            │
│                                  │                                      │
│                                  ▼                                      │
│                         ┌──────────────────┐                            │
│                         │  Backend Router  │                            │
│                         │      Node        │                            │
│                         └────────┬─────────┘                            │
│                                  │                                      │
│         ┌────────────────────────┼────────────────────────┐            │
│         │                        │                        │            │
│         ▼                        ▼                        ▼            │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
│  │  Anthropic  │          │   OpenAI    │          │   Ollama    │     │
│  │   Adapter   │          │   Adapter   │          │   Adapter   │     │
│  │    Node     │          │    Node     │          │    Node     │     │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘     │
│         │                        │                        │            │
│         └────────────────────────┴────────────────────────┘            │
│                                  │                                      │
│                                  ▼                                      │
│                         ┌──────────────────┐                            │
│                         │  Denormalizer    │                            │
│                         │      Node        │                            │
│                         └────────┬─────────┘                            │
│                                  │                                      │
│                                  ▼                                      │
│                         ┌──────────────────┐                            │
│                         │   Responder      │                            │
│                         │      Node        │                            │
│                         └──────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Exposed

When running acphos as a server:

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `POST /v1/messages` | Anthropic Messages | Compatible with Anthropic SDK |
| `POST /v1/responses` | OpenAI Responses | Compatible with OpenAI SDK (responses) |
| `POST /v1/chat/completions` | OpenAI Chat | Compatible with OpenAI SDK (chat) |
| `WS /v1/realtime` | WebSocket | Real-time bidirectional |
| `stdio` | ACP | JSON-RPC over stdin/stdout |

---

## Translation Matrix

### Feature Mapping

| Source Feature | ACP Internal | Anthropic Out | OpenAI Out |
|----------------|--------------|---------------|------------|
| `thinking` (Anthropic) | `thought_chunk` | `thinking_delta` | `reasoning_summary` |
| `reasoning` (OpenAI) | `thought_chunk` | `thinking` | `reasoning` |
| `tool_use` | `tool_call` | `tool_use` | `function_call` |
| `web_search` (OpenAI) | `tool_call` (MCP) | MCP tool | `web_search` |
| `cache_control` (Anthropic) | `_meta.anthropic.cache` | `cache_control` | (dropped) |
| `prediction` (OpenAI) | `_meta.openai.prediction` | (dropped) | `prediction` |

### Lossy Translations

Some features don't translate cleanly:

| Feature | From | To | Handling |
|---------|------|-----|----------|
| `cache_control` | Anthropic | OpenAI | Dropped (no equivalent) |
| `web_search` builtin | OpenAI | Anthropic | Convert to MCP tool or drop |
| `reasoning` full | OpenAI | Anthropic | Convert to `thinking` |
| `extended_thinking` | Anthropic | Ollama | Dropped (no equivalent) |

---

## Use Cases

### 1. Provider Migration
Switch from OpenAI to Anthropic without changing client code:
```
OpenAI SDK → acphos → Anthropic API
```

### 2. Local Development
Run Claude Code UX against local Ollama:
```
Claude Code → acphos → Ollama (localhost)
```

### 3. Cost Optimization
Route simple queries to cheap models, complex to expensive:
```
Any Client → acphos → [Router] → GPT-4.1-mini (simple)
                              → Claude Opus (complex)
```

### 4. Unified API Gateway
Expose single API, route to multiple backends:
```
Internal Apps → acphos → Anthropic / OpenAI / Azure / Bedrock
```

### 5. Protocol Bridge
Connect incompatible systems:
```
Legacy Chat Completions Client → acphos → Modern Responses API
```

---

## Summary

| Component | Role |
|-----------|------|
| **acphos-front** | Ingest any protocol → Internal ACP |
| **acphos-back** | Internal ACP → Output any protocol |
| **ACP Core** | Routing, meta processing, capability gating |
| **Rete.js Graph** | Visual configuration, dynamic routing |

**The key insight:** ACP is the universal internal representation. Front translates *into* it, back translates *out of* it. Any-to-any becomes trivial composition.
