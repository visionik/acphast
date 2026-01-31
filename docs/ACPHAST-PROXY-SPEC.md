# ACP Proxy Specification

**Version:** 0.1.0-draft  
**Date:** 2026-01-31  
**Status:** Proposal

## Abstract

This specification defines how to use the Agent Client Protocol (ACP) as a universal proxy layer for LLM backend communication. The goal is to enable any ACP-speaking agent to communicate with any LLM backend—whether that backend speaks ACP natively, OpenAI Responses API, Anthropic Messages API, or proprietary WebSocket protocols—without losing provider-specific capabilities.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            IDE / Editor                              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ ACP (stdio/HTTP/WS)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              Agent                                   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      ACP Proxy Layer                         │   │
│   │                                                              │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│   │
│   │  │   ACP    │ │ OpenAI   │ │Anthropic │ │   WebSocket/     ││   │
│   │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │   Proprietary    ││   │
│   │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘│   │
│   └───────┼────────────┼────────────┼────────────────┼──────────┘   │
└───────────┼────────────┼────────────┼────────────────┼──────────────┘
            │            │            │                │
            ▼            ▼            ▼                ▼
       ┌─────────┐  ┌─────────┐  ┌─────────┐    ┌─────────────┐
       │  ACP    │  │ OpenAI  │  │Anthropic│    │ Cursor/     │
       │ Agent   │  │Responses│  │Messages │    │ Copilot/etc │
       └─────────┘  └─────────┘  └─────────┘    └─────────────┘
```

The agent speaks ACP on both edges:
- **Upstream**: Receives ACP from IDE/editor
- **Downstream**: Sends ACP to proxy layer, which translates to native backend protocols

---

## 2. Design Principles

### 2.1 Lossless Translation
Provider-specific features MUST be preserved through `_meta` extensions. No capability should be lost when proxying through ACP.

### 2.2 Graceful Degradation
When a backend doesn't support a requested feature, the proxy MUST:
1. Return a clear error, OR
2. Provide a sensible fallback behavior documented in capabilities

### 2.3 Capability Discovery
Backends advertise their capabilities during `session/initialize`. Clients can query what's available before making requests.

### 2.4 Extension Namespace
All provider-specific extensions use the `_meta` object with namespaced keys:
- `_meta.openai.*` — OpenAI-specific
- `_meta.anthropic.*` — Anthropic-specific
- `_meta.proxy.*` — Proxy layer metadata
- `_meta.provider.*` — Generic provider info

---

## 3. Capability Negotiation

### 3.1 Extended AgentCapabilities

```json
{
  "agentCapabilities": {
    "loadSession": true,
    "promptCapabilities": {
      "audio": true,
      "image": true,
      "embeddedContext": true
    },
    "sessionCapabilities": {
      "modes": true
    },
    "_meta": {
      "proxy": {
        "version": "0.1.0",
        "backends": ["openai", "anthropic", "ollama"],
        "defaultBackend": "anthropic"
      },
      "anthropic": {
        "thinking": ["disabled", "enabled", "streaming"],
        "cacheControl": true,
        "maxThinkingTokens": 32000,
        "models": ["claude-sonnet-4-20250514", "claude-opus-4-20250514"]
      },
      "openai": {
        "reasoning": ["disabled", "low", "medium", "high"],
        "reasoningSummary": ["disabled", "auto", "always"],
        "builtinTools": ["code_interpreter", "file_search", "web_search"],
        "models": ["gpt-4.1", "o3", "o4-mini"]
      },
      "ollama": {
        "models": ["llama3.1:8b", "qwen2.5-coder:32b"],
        "contextLength": 131072
      }
    }
  }
}
```

### 3.2 Backend Selection

Clients specify backend in session creation or per-prompt:

```json
{
  "method": "session/new",
  "params": {
    "cwd": "/path/to/project",
    "mcpServers": [],
    "_meta": {
      "proxy": {
        "backend": "anthropic",
        "model": "claude-sonnet-4-20250514"
      }
    }
  }
}
```

---

## 4. Message Translation

### 4.1 Prompt Request

**ACP PromptRequest:**
```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_123",
    "prompt": [
      {
        "type": "text",
        "text": "Refactor this function to use async/await"
      },
      {
        "type": "resource",
        "resource": {
          "uri": "file:///src/index.ts",
          "text": "function getData() { return fetch(...).then(...) }"
        }
      }
    ],
    "_meta": {
      "anthropic": {
        "thinking": "enabled",
        "maxThinkingTokens": 10000
      }
    }
  }
}
```

**Translated to Anthropic Messages API:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 8192,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  },
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Refactor this function to use async/await"
        },
        {
          "type": "text",
          "text": "<file path=\"/src/index.ts\">\nfunction getData() { return fetch(...).then(...) }\n</file>"
        }
      ]
    }
  ]
}
```

**Translated to OpenAI Responses API:**
```json
{
  "model": "gpt-4.1",
  "input": [
    {
      "type": "message",
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Refactor this function to use async/await\n\n<file path=\"/src/index.ts\">\nfunction getData() { return fetch(...).then(...) }\n</file>"
        }
      ]
    }
  ],
  "reasoning": {
    "effort": "medium"
  }
}
```

---

## 5. Streaming Translation

### 5.1 Session Updates

All backends stream via `session/update` notifications:

```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "content_chunk",
      "content": {
        "type": "text",
        "text": "Here's the refactored"
      }
    }
  }
}
```

### 5.2 Thinking/Reasoning Blocks

**Anthropic thinking → ACP:**
```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "thought_chunk",
      "content": {
        "type": "text",
        "text": "I need to identify the promise chain and convert it..."
      },
      "_meta": {
        "anthropic": {
          "thinkingBlockId": "thinking_1"
        }
      }
    }
  }
}
```

**OpenAI reasoning summary → ACP:**
```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "thought_chunk",
      "content": {
        "type": "text",
        "text": "Analyzed the async patterns and determined..."
      },
      "_meta": {
        "openai": {
          "reasoningSummary": true,
          "reasoningTokens": 1247
        }
      }
    }
  }
}
```

---

## 6. Tool Calls

### 6.1 Client-Executed Tools

Standard ACP/MCP tool flow—no translation needed.

### 6.2 Server-Executed Tools (OpenAI Built-ins)

**Request with built-in tool:**
```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_123",
    "prompt": [{"type": "text", "text": "Search the web for ACP protocol"}],
    "_meta": {
      "openai": {
        "builtinTools": [
          {"type": "web_search"}
        ]
      }
    }
  }
}
```

**Tool execution update:**
```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "tool_call",
      "toolCall": {
        "id": "call_abc123",
        "name": "web_search",
        "arguments": {"query": "ACP protocol"},
        "_meta": {
          "openai": {
            "builtinTool": true,
            "serverExecuted": true
          }
        }
      }
    }
  }
}
```

**Tool result update (server-executed):**
```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "tool_result",
      "toolCallId": "call_abc123",
      "content": [
        {"type": "text", "text": "Found 5 results..."}
      ],
      "_meta": {
        "openai": {
          "serverExecuted": true
        }
      }
    }
  }
}
```

---

## 7. Stop Reasons

### 7.1 Standard Stop Reasons

| ACP StopReason | OpenAI | Anthropic |
|----------------|--------|-----------|
| `end_turn` | `stop` | `end_turn` |
| `tool_use` | `tool_calls` | `tool_use` |
| `max_tokens` | `length` | `max_tokens` |
| `cancelled` | N/A (client-side) | N/A |
| `error` | N/A | N/A |

### 7.2 Extended Stop Reasons

```json
{
  "method": "session/prompt",
  "id": 42,
  "result": {
    "stopReason": "end_turn",
    "_meta": {
      "anthropic": {
        "stopReason": "end_turn",
        "stopSequence": null
      },
      "proxy": {
        "usage": {
          "inputTokens": 1523,
          "outputTokens": 847,
          "thinkingTokens": 3201,
          "cacheReadTokens": 1200,
          "cacheWriteTokens": 323
        }
      }
    }
  }
}
```

---

## 8. Token Usage

### 8.1 Usage Update

Sent as a session update during or after generation:

```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "usage",
      "_meta": {
        "proxy": {
          "usage": {
            "inputTokens": 1523,
            "outputTokens": 847,
            "totalTokens": 2370
          }
        },
        "anthropic": {
          "cacheReadInputTokens": 1200,
          "cacheCreationInputTokens": 323,
          "thinkingTokens": 3201
        }
      }
    }
  }
}
```

### 8.2 Cost Estimation (Optional)

```json
{
  "_meta": {
    "proxy": {
      "usage": {...},
      "cost": {
        "inputCost": 0.004569,
        "outputCost": 0.012705,
        "totalCost": 0.017274,
        "currency": "USD"
      }
    }
  }
}
```

---

## 9. Provider-Specific Extensions

### 9.1 Anthropic Extensions

```typescript
interface AnthropicMeta {
  // Thinking/Extended Thinking
  thinking?: "disabled" | "enabled" | "streaming";
  maxThinkingTokens?: number;
  thinkingBlockId?: string;
  
  // Prompt Caching
  cacheControl?: {
    type: "ephemeral";
    ttl?: number;
  };
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  
  // Model-specific
  stopSequences?: string[];
  
  // Beta features
  interleaved_thinking?: boolean;
}
```

**Example: Prompt caching hint**
```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_123",
    "prompt": [
      {
        "type": "text",
        "text": "You are a coding assistant...",
        "_meta": {
          "anthropic": {
            "cacheControl": {"type": "ephemeral"}
          }
        }
      },
      {
        "type": "text", 
        "text": "Refactor this code"
      }
    ]
  }
}
```

### 9.2 OpenAI Extensions

```typescript
interface OpenAIMeta {
  // Reasoning (o-series models)
  reasoning?: {
    effort: "low" | "medium" | "high";
    summary?: "disabled" | "auto" | "always";
  };
  reasoningTokens?: number;
  
  // Built-in tools
  builtinTools?: Array<{
    type: "web_search" | "code_interpreter" | "file_search";
    config?: object;
  }>;
  
  // File handling
  fileIds?: string[];
  vectorStoreIds?: string[];
  
  // Response format
  responseFormat?: {
    type: "text" | "json_object" | "json_schema";
    schema?: object;
  };
  
  // Predictions (speculative decoding)
  prediction?: {
    type: "content";
    content: string;
  };
}
```

**Example: Reasoning with summary**
```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_123",
    "prompt": [{"type": "text", "text": "Solve this math problem..."}],
    "_meta": {
      "openai": {
        "reasoning": {
          "effort": "high",
          "summary": "always"
        }
      }
    }
  }
}
```

### 9.3 Ollama/Local Extensions

```typescript
interface OllamaMeta {
  // Model parameters
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  
  // Context
  contextLength?: number;
  numPredict?: number;
  
  // Hardware
  numGpu?: number;
  mainGpu?: number;
  
  // Keep-alive
  keepAlive?: string;  // e.g., "5m", "24h"
}
```

### 9.4 WebSocket/Proprietary Extensions

```typescript
interface WebSocketMeta {
  // Connection
  endpoint?: string;
  reconnect?: boolean;
  heartbeatMs?: number;
  
  // Cursor-specific
  cursor?: {
    projectContext?: boolean;
    codebaseIndex?: string;
    diffFormat?: "unified" | "split";
  };
  
  // Copilot-specific
  copilot?: {
    editorContext?: object;
    completionType?: "inline" | "panel";
  };
}
```

---

## 10. Adapter Implementation Guide

### 10.1 Adapter Interface

```typescript
interface BackendAdapter {
  // Identification
  readonly id: string;
  readonly name: string;
  
  // Capabilities
  getCapabilities(): Promise<AdapterCapabilities>;
  
  // Session lifecycle
  createSession(config: SessionConfig): Promise<string>;
  loadSession(sessionId: string): Promise<void>;
  destroySession(sessionId: string): Promise<void>;
  
  // Prompt handling
  prompt(
    sessionId: string,
    request: PromptRequest,
    onUpdate: (update: SessionUpdate) => void
  ): Promise<PromptResponse>;
  
  // Cancellation
  cancel(sessionId: string): Promise<void>;
}
```

### 10.2 Translation Helpers

```typescript
// Convert ACP ContentBlock to provider format
function translateContent(
  content: ContentBlock[],
  target: "anthropic" | "openai" | "ollama"
): ProviderContent;

// Convert provider response to ACP updates
function translateResponse(
  response: ProviderResponse,
  source: "anthropic" | "openai" | "ollama"
): SessionUpdate[];

// Extract and merge _meta from nested content
function collectMeta(content: ContentBlock[]): Record<string, unknown>;
```

### 10.3 Example: Anthropic Adapter

```typescript
class AnthropicAdapter implements BackendAdapter {
  readonly id = "anthropic";
  readonly name = "Anthropic Claude";
  
  private client: Anthropic;
  private sessions: Map<string, AnthropicSession>;
  
  async prompt(
    sessionId: string,
    request: PromptRequest,
    onUpdate: (update: SessionUpdate) => void
  ): Promise<PromptResponse> {
    const session = this.sessions.get(sessionId);
    const meta = request._meta?.anthropic ?? {};
    
    // Build Anthropic request
    const anthropicRequest: MessageCreateParams = {
      model: session.model,
      max_tokens: meta.maxTokens ?? 8192,
      messages: this.translateMessages(session.history, request.prompt),
      stream: true,
    };
    
    // Add thinking if requested
    if (meta.thinking === "enabled") {
      anthropicRequest.thinking = {
        type: "enabled",
        budget_tokens: meta.maxThinkingTokens ?? 10000,
      };
    }
    
    // Stream response
    const stream = await this.client.messages.stream(anthropicRequest);
    
    for await (const event of stream) {
      const update = this.translateEvent(event);
      onUpdate(update);
    }
    
    const finalMessage = await stream.finalMessage();
    return this.translateFinalResponse(finalMessage);
  }
  
  private translateEvent(event: MessageStreamEvent): SessionUpdate {
    switch (event.type) {
      case "content_block_delta":
        if (event.delta.type === "thinking_delta") {
          return {
            type: "thought_chunk",
            content: {
              type: "text",
              text: event.delta.thinking,
            },
            _meta: {
              anthropic: {
                thinkingBlockId: `thinking_${event.index}`,
              },
            },
          };
        }
        return {
          type: "content_chunk",
          content: {
            type: "text",
            text: event.delta.text,
          },
        };
      
      case "message_delta":
        if (event.usage) {
          return {
            type: "usage",
            _meta: {
              proxy: {
                usage: {
                  inputTokens: event.usage.input_tokens,
                  outputTokens: event.usage.output_tokens,
                },
              },
              anthropic: {
                cacheReadInputTokens: event.usage.cache_read_input_tokens,
                cacheCreationInputTokens: event.usage.cache_creation_input_tokens,
              },
            },
          };
        }
        break;
    }
  }
}
```

---

## 11. Error Handling

### 11.1 Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32001 | `backend_unavailable` | Backend service unreachable |
| -32002 | `backend_error` | Backend returned an error |
| -32003 | `capability_unsupported` | Requested feature not supported |
| -32004 | `rate_limited` | Rate limit exceeded |
| -32005 | `context_exceeded` | Context window exceeded |
| -32006 | `auth_failed` | Backend authentication failed |

### 11.2 Error Response with Retry Info

```json
{
  "error": {
    "code": -32004,
    "message": "Rate limit exceeded",
    "data": {
      "_meta": {
        "proxy": {
          "retryAfterMs": 30000,
          "backend": "anthropic",
          "requestId": "req_xyz"
        },
        "anthropic": {
          "rateLimitType": "tokens_per_minute",
          "rateLimitRemaining": 0,
          "rateLimitReset": "2026-01-31T13:25:00Z"
        }
      }
    }
  }
}
```

---

## 12. Configuration

### 12.1 Proxy Configuration File

```toml
[proxy]
version = "0.1.0"
default_backend = "anthropic"

[backends.anthropic]
enabled = true
api_key_env = "ANTHROPIC_API_KEY"
default_model = "claude-sonnet-4-20250514"
max_retries = 3
timeout_ms = 120000

[backends.anthropic.defaults]
max_tokens = 8192
thinking = "enabled"

[backends.openai]
enabled = true
api_key_env = "OPENAI_API_KEY"
default_model = "gpt-4.1"
base_url = "https://api.openai.com/v1"

[backends.openai.defaults]
reasoning_effort = "medium"

[backends.ollama]
enabled = true
base_url = "http://localhost:11434"
default_model = "llama3.1:8b"

[backends.cursor]
enabled = false
type = "websocket"
endpoint = "wss://api.cursor.sh/v1/agent"
```

---

## 13. Security Considerations

### 13.1 Credential Isolation
- Backend API keys MUST NOT be exposed to the client
- The proxy layer handles all authentication
- Session tokens are proxy-scoped, not backend-scoped

### 13.2 Request Sanitization
- `_meta` from clients MUST be validated against allowed extensions
- Unknown `_meta` keys SHOULD be logged and dropped
- Injection attempts in content MUST be escaped appropriately for each backend

### 13.3 Rate Limiting
- Proxy SHOULD implement per-client rate limiting independent of backend limits
- Aggregate rate limit status SHOULD be exposed in capabilities

---

## 14. Versioning

### 14.1 Protocol Version
The proxy protocol version follows semver and is independent of ACP version:
- `proxy.version` in capabilities indicates proxy protocol version
- ACP `protocolVersion` in initialize indicates base ACP compatibility

### 14.2 Backend Version Discovery
```json
{
  "_meta": {
    "proxy": {
      "version": "0.1.0",
      "acp_version": "2025-01"
    },
    "anthropic": {
      "api_version": "2024-10-22",
      "model_version": "claude-sonnet-4-20250514"
    }
  }
}
```

---

## 15. Future Considerations

### 15.1 Multi-Backend Orchestration
- Route different parts of a conversation to different backends
- Fallback chains (try Anthropic → OpenAI → Ollama)
- Cost-based routing

### 15.2 Caching Layer
- Response caching for identical prompts
- Semantic similarity caching
- Cross-session context sharing

### 15.3 Observability
- Structured logging with trace IDs
- Metrics export (Prometheus, OpenTelemetry)
- Request/response audit logging

---

## Appendix A: Complete _meta Schema

```typescript
interface ProxyMeta {
  proxy?: {
    version?: string;
    backend?: string;
    model?: string;
    requestId?: string;
    traceId?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      thinkingTokens?: number;
    };
    cost?: {
      inputCost?: number;
      outputCost?: number;
      totalCost?: number;
      currency?: string;
    };
    timing?: {
      queuedMs?: number;
      processingMs?: number;
      totalMs?: number;
    };
    retryAfterMs?: number;
  };
  
  anthropic?: AnthropicMeta;
  openai?: OpenAIMeta;
  ollama?: OllamaMeta;
  cursor?: CursorMeta;
  copilot?: CopilotMeta;
  
  // Allow arbitrary provider extensions
  [provider: string]: unknown;
}
```

---

## Appendix B: Reference Implementations

- **TypeScript**: `@acp-proxy/core` (reference implementation)
- **Rust**: `acp-proxy` crate
- **Python**: `acp-proxy` package

---

## Changelog

### 0.1.0-draft (2026-01-31)
- Initial draft specification
- Core translation mappings for Anthropic, OpenAI, Ollama
- `_meta` extension system
- Error handling and configuration
