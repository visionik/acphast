# Acphos

**ACP Proxy using Rete.js filter graph architecture**

## Overview

Acphos is a universal proxy that lets any ACP-speaking agent communicate with any LLM backend—Anthropic, OpenAI, Ollama, or other ACP agents—without losing provider-specific capabilities.

```
┌─────────┐      ACP       ┌─────────────────────────────────────────────┐      Native API      ┌──────────┐
│  IDE    │ ◄────────────► │                  Acphos                     │ ◄──────────────────► │ Backend  │
│ Editor  │    stdio/HTTP  │  (Rete.js filter graph)                     │   REST/WS/stdio      │  LLM     │
└─────────┘                └─────────────────────────────────────────────┘                      └──────────┘
```

---

## Core Architecture

```
ACPReceiver → MetaInjector → BackendSelector → [Adapters] → UsageAggregator → ACPResponder
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Anthropic         OpenAI          Ollama
               Adapter          Adapter         Adapter
```

---

## Node Types

| Type | Purpose | Examples |
|------|---------|----------|
| `AcphosNode` | Base class with async `process()` | MetaInjector, UsageAggregator |
| `StreamingNode` | Yields `AsyncIterable` for LLM streaming | AnthropicAdapter, OpenAIAdapter |
| `RouterNode` | Conditional branching based on input | BackendSelector, CapabilityGate |

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **Multi-backend** | BackendSelector routes by `_meta.proxy.backend` or capability requirements |
| **Streaming** | StreamingNode yields ACP notifications, forwarded via `ctx.onUpdate()` |
| **Lossless translation** | Provider features preserved in `_meta.anthropic.*`, `_meta.openai.*`, etc. |
| **Visual editing** | Optional Rete.js UI for debugging/configuring graphs |
| **Headless mode** | Engine runs without UI in production |
| **Graph config** | JSON-serializable graph definitions |

---

## Project Structure

```
acphos/
├── src/
│   ├── index.ts                 # Entry point
│   ├── engine/
│   │   ├── engine.ts            # Headless dataflow engine
│   │   └── visual.ts            # Optional Rete.js visual editor
│   ├── nodes/
│   │   ├── base.ts              # AcphosNode, StreamingNode, RouterNode
│   │   ├── input/
│   │   │   └── acp-receiver.ts
│   │   ├── routing/
│   │   │   ├── backend-selector.ts
│   │   │   └── capability-gate.ts
│   │   ├── adapters/
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── ollama.ts
│   │   ├── transform/
│   │   │   ├── meta-injector.ts
│   │   │   └── usage-aggregator.ts
│   │   └── output/
│   │       └── acp-responder.ts
│   ├── sockets/
│   │   └── index.ts             # Socket type definitions
│   └── transport/
│       ├── stdio.ts             # JSON-RPC over stdio
│       └── http.ts              # HTTP + SSE
├── graphs/
│   └── default.json             # Default proxy graph
├── package.json
└── tsconfig.json
```

---

## Dependencies

```json
{
  "dependencies": {
    "rete": "^2.0.0",
    "rete-engine": "^2.0.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "openai": "^4.70.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "rete-area-plugin": "^2.0.0",
    "rete-react-plugin": "^2.0.0",
    "rete-connection-plugin": "^2.0.0"
  }
}
```

---

## Streaming Flow

```typescript
// Adapter yields ACP notifications
async *processStream(inputs, ctx): AsyncIterable<ACPNotification> {
  const stream = await anthropic.messages.stream(request);
  
  for await (const event of stream) {
    yield {
      method: 'session/update',
      params: {
        sessionId: ctx.sessionId,
        update: {
          type: 'content_chunk',
          content: { type: 'text', text: event.delta.text }
        }
      }
    };
  }
}

// Engine forwards to transport
ctx.onUpdate = (notification) => {
  transport.sendNotification(notification);
};
```

---

## Graph Configuration

```json
{
  "nodes": [
    { "id": "receiver", "type": "ACPReceiver" },
    { "id": "selector", "type": "BackendSelector", "config": {
      "defaultBackend": "anthropic",
      "backends": {
        "anthropic": { "features": { "thinking": true } },
        "openai": { "features": { "reasoning": true } }
      }
    }},
    { "id": "anthropic", "type": "AnthropicAdapter", "config": {
      "defaultModel": "claude-sonnet-4-20250514"
    }}
  ],
  "connections": [
    { "from": "receiver:request", "to": "selector:in" },
    { "from": "selector:anthropic", "to": "anthropic:in" }
  ]
}
```

---

## Why Rete.js?

| Requirement | Rete.js |
|-------------|---------|
| TypeScript-first | ✅ |
| Processing engine | ✅ Dataflow engine included |
| Visual editor | ✅ Optional, plug in when needed |
| Async support | ✅ |
| Headless mode | ✅ Engine runs without UI |
| Maturity | ✅ 5+ years, active development |

---

## Build Steps

1. **Initialize project**
   ```bash
   mkdir acphos && cd acphos
   npm init -y
   npm install rete rete-engine @anthropic-ai/sdk openai
   npm install -D typescript @types/node
   ```

2. **Start with headless engine + stdio transport**
   - Implement base nodes
   - Wire up default graph
   - Test with ACP client

3. **Add visual editor later**
   ```bash
   npm install rete-area-plugin rete-react-plugin rete-connection-plugin
   ```

4. **Extend with more adapters**
   - Ollama, Groq, Together, etc.
   - WebSocket backends (Cursor, Copilot)

---

## Related Documents

- [ACP Proxy Specification](./ACP-PROXY-SPEC.md) — Protocol-level details, `_meta` schemas
- [Acphos Architecture](./ACPHOS-ARCHITECTURE.md) — Full implementation with code

---

## Status

**Draft** — Not yet implemented. This is the design spec.
