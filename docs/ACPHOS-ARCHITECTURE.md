# Acphos Architecture

**Rete.js-based ACP Proxy Implementation**

## Overview

Acphos uses Rete.js as its processing core, treating ACP message translation as a dataflow graph. Each node handles a specific transformation or routing decision.

---

## 1. Project Structure

```
acphos/
├── src/
│   ├── index.ts                 # Entry point
│   ├── engine/
│   │   ├── editor.ts            # Rete editor setup (optional UI)
│   │   ├── engine.ts            # Headless dataflow engine
│   │   └── context.ts           # Shared execution context
│   ├── nodes/
│   │   ├── index.ts             # Node registry
│   │   ├── base.ts              # Base node classes
│   │   ├── input/
│   │   │   ├── acp-receiver.ts  # Receives ACP requests
│   │   │   └── webhook.ts       # HTTP webhook input
│   │   ├── routing/
│   │   │   ├── capability-gate.ts
│   │   │   ├── backend-selector.ts
│   │   │   └── load-balancer.ts
│   │   ├── adapters/
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   ├── ollama.ts
│   │   │   ├── acp-passthrough.ts
│   │   │   └── websocket.ts
│   │   ├── transform/
│   │   │   ├── meta-injector.ts
│   │   │   ├── content-translator.ts
│   │   │   └── usage-aggregator.ts
│   │   └── output/
│   │       ├── acp-responder.ts
│   │       └── logger.ts
│   ├── sockets/
│   │   ├── index.ts             # Socket type definitions
│   │   ├── acp.ts               # ACP message sockets
│   │   └── stream.ts            # Async iterable sockets
│   ├── transport/
│   │   ├── stdio.ts             # JSON-RPC over stdio
│   │   ├── http.ts              # HTTP + SSE
│   │   └── websocket.ts         # WebSocket transport
│   └── config/
│       ├── schema.ts            # Config validation
│       └── loader.ts            # Load graph from config
├── graphs/
│   ├── default.json             # Default proxy graph
│   ├── anthropic-only.json      # Single backend
│   └── multi-backend.json       # Load balanced
├── package.json
└── tsconfig.json
```

---

## 2. Core Types

```typescript
// src/types.ts

import { ClassicPreset } from 'rete';

// ─────────────────────────────────────────────────────────────
// ACP Message Types (simplified)
// ─────────────────────────────────────────────────────────────

export interface ACPRequest {
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface ACPResponse {
  id: string | number;
  result?: unknown;
  error?: ACPError;
}

export interface ACPNotification {
  method: string;
  params: Record<string, unknown>;
}

export interface ACPError {
  code: number;
  message: string;
  data?: unknown;
}

// ─────────────────────────────────────────────────────────────
// Internal Pipeline Types
// ─────────────────────────────────────────────────────────────

export interface PipelineContext {
  requestId: string;
  sessionId?: string;
  startTime: number;
  meta: Record<string, unknown>;
  
  // Streaming callback
  onUpdate?: (update: ACPNotification) => void;
}

export interface PipelineMessage {
  ctx: PipelineContext;
  request: ACPRequest;
  backend?: string;
  translated?: unknown;  // Backend-specific format
  response?: unknown;    // Backend response
}

// ─────────────────────────────────────────────────────────────
// Streaming Support
// ─────────────────────────────────────────────────────────────

export type StreamingResult = AsyncIterable<ACPNotification>;

export interface StreamingPipelineMessage extends PipelineMessage {
  stream?: StreamingResult;
}

// ─────────────────────────────────────────────────────────────
// Backend Capabilities
// ─────────────────────────────────────────────────────────────

export interface BackendCapabilities {
  id: string;
  name: string;
  models: string[];
  features: {
    thinking?: boolean;
    caching?: boolean;
    vision?: boolean;
    audio?: boolean;
    tools?: boolean;
    streaming?: boolean;
  };
  limits: {
    maxContextTokens?: number;
    maxOutputTokens?: number;
    requestsPerMinute?: number;
  };
}
```

---

## 3. Socket Definitions

```typescript
// src/sockets/index.ts

import { ClassicPreset } from 'rete';

// Base sockets for type safety
export const Sockets = {
  // ACP Messages
  ACPRequest: new ClassicPreset.Socket('ACP Request'),
  ACPResponse: new ClassicPreset.Socket('ACP Response'),
  ACPNotification: new ClassicPreset.Socket('ACP Notification'),
  
  // Pipeline
  Pipeline: new ClassicPreset.Socket('Pipeline Message'),
  PipelineStream: new ClassicPreset.Socket('Pipeline Stream'),
  
  // Control
  Trigger: new ClassicPreset.Socket('Trigger'),
  Config: new ClassicPreset.Socket('Config'),
  
  // Backend-specific
  AnthropicRequest: new ClassicPreset.Socket('Anthropic Request'),
  AnthropicResponse: new ClassicPreset.Socket('Anthropic Response'),
  OpenAIRequest: new ClassicPreset.Socket('OpenAI Request'),
  OpenAIResponse: new ClassicPreset.Socket('OpenAI Response'),
};
```

---

## 4. Base Node Classes

```typescript
// src/nodes/base.ts

import { ClassicPreset } from 'rete';
import type { PipelineMessage, PipelineContext, StreamingResult } from '../types';
import { Sockets } from '../sockets';

// ─────────────────────────────────────────────────────────────
// Base Acphos Node
// ─────────────────────────────────────────────────────────────

export abstract class AcphosNode extends ClassicPreset.Node {
  abstract process(
    inputs: Record<string, unknown[]>,
    ctx: PipelineContext
  ): Promise<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────
// Streaming Node (for LLM adapters)
// ─────────────────────────────────────────────────────────────

export abstract class StreamingNode extends AcphosNode {
  abstract processStream(
    inputs: Record<string, unknown[]>,
    ctx: PipelineContext
  ): StreamingResult;
  
  // Default process() collects stream into final response
  async process(
    inputs: Record<string, unknown[]>,
    ctx: PipelineContext
  ): Promise<Record<string, unknown>> {
    const chunks: unknown[] = [];
    for await (const chunk of this.processStream(inputs, ctx)) {
      chunks.push(chunk);
      ctx.onUpdate?.(chunk);
    }
    return { collected: chunks };
  }
}

// ─────────────────────────────────────────────────────────────
// Router Node (for conditional branching)
// ─────────────────────────────────────────────────────────────

export abstract class RouterNode extends AcphosNode {
  abstract route(
    inputs: Record<string, unknown[]>,
    ctx: PipelineContext
  ): string;  // Returns output port name
}
```

---

## 5. Input Nodes

```typescript
// src/nodes/input/acp-receiver.ts

import { ClassicPreset } from 'rete';
import { AcphosNode } from '../base';
import { Sockets } from '../../sockets';
import type { ACPRequest, PipelineMessage, PipelineContext } from '../../types';

export class ACPReceiverNode extends AcphosNode {
  constructor() {
    super('ACP Receiver');
    
    // No inputs - this is an entry point
    this.addOutput('request', new ClassicPreset.Output(Sockets.Pipeline, 'Request'));
    this.addOutput('notification', new ClassicPreset.Output(Sockets.Pipeline, 'Notification'));
  }
  
  // Called externally when ACP message arrives
  injectMessage(request: ACPRequest, onUpdate: (n: any) => void): PipelineMessage {
    const ctx: PipelineContext = {
      requestId: crypto.randomUUID(),
      sessionId: request.params?.sessionId as string,
      startTime: Date.now(),
      meta: {},
      onUpdate,
    };
    
    return {
      ctx,
      request,
    };
  }
  
  async process(): Promise<Record<string, unknown>> {
    // Entry point - process is triggered externally
    return {};
  }
}
```

---

## 6. Routing Nodes

```typescript
// src/nodes/routing/backend-selector.ts

import { ClassicPreset } from 'rete';
import { RouterNode } from '../base';
import { Sockets } from '../../sockets';
import type { PipelineMessage, PipelineContext, BackendCapabilities } from '../../types';

interface BackendSelectorConfig {
  defaultBackend: string;
  backends: Record<string, BackendCapabilities>;
}

export class BackendSelectorNode extends RouterNode {
  config: BackendSelectorConfig;
  
  constructor(config: BackendSelectorConfig) {
    super('Backend Selector');
    this.config = config;
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    
    // Dynamic outputs per backend
    for (const backendId of Object.keys(config.backends)) {
      this.addOutput(backendId, new ClassicPreset.Output(Sockets.Pipeline, backendId));
    }
  }
  
  route(inputs: Record<string, PipelineMessage[]>, ctx: PipelineContext): string {
    const msg = inputs.in?.[0];
    if (!msg) return this.config.defaultBackend;
    
    // Check _meta.proxy.backend
    const requestedBackend = (msg.request.params?._meta as any)?.proxy?.backend;
    if (requestedBackend && this.config.backends[requestedBackend]) {
      return requestedBackend;
    }
    
    // Check required capabilities
    const meta = msg.request.params?._meta as any;
    if (meta?.anthropic?.thinking) {
      // Needs thinking - must be Anthropic
      if (this.config.backends.anthropic?.features.thinking) {
        return 'anthropic';
      }
    }
    
    if (meta?.openai?.reasoning) {
      // Needs reasoning - must be OpenAI
      if (this.config.backends.openai) {
        return 'openai';
      }
    }
    
    return this.config.defaultBackend;
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg) return {};
    
    const targetBackend = this.route(inputs, ctx);
    msg.backend = targetBackend;
    
    return { [targetBackend]: msg };
  }
}
```

```typescript
// src/nodes/routing/capability-gate.ts

import { ClassicPreset } from 'rete';
import { AcphosNode } from '../base';
import { Sockets } from '../../sockets';
import type { PipelineMessage, PipelineContext, BackendCapabilities } from '../../types';

export class CapabilityGateNode extends AcphosNode {
  requiredCapabilities: (keyof BackendCapabilities['features'])[];
  
  constructor(capabilities: (keyof BackendCapabilities['features'])[]) {
    super('Capability Gate');
    this.requiredCapabilities = capabilities;
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    this.addOutput('pass', new ClassicPreset.Output(Sockets.Pipeline, 'Pass'));
    this.addOutput('fail', new ClassicPreset.Output(Sockets.Pipeline, 'Fail'));
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg) return {};
    
    // Check if backend has required capabilities
    // (In real impl, this would look up backend config)
    const hasCapabilities = true; // TODO: actual check
    
    return hasCapabilities ? { pass: msg } : { fail: msg };
  }
}
```

---

## 7. Adapter Nodes

```typescript
// src/nodes/adapters/anthropic.ts

import { ClassicPreset } from 'rete';
import Anthropic from '@anthropic-ai/sdk';
import { StreamingNode } from '../base';
import { Sockets } from '../../sockets';
import type { 
  PipelineMessage, 
  PipelineContext, 
  ACPNotification,
  StreamingResult 
} from '../../types';

interface AnthropicConfig {
  apiKey?: string;
  defaultModel: string;
  defaultMaxTokens: number;
}

export class AnthropicAdapterNode extends StreamingNode {
  private client: Anthropic;
  private config: AnthropicConfig;
  
  constructor(config: AnthropicConfig) {
    super('Anthropic Adapter');
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey });
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.Pipeline, 'Output'));
  }
  
  // ─────────────────────────────────────────────────────────────
  // ACP → Anthropic Translation
  // ─────────────────────────────────────────────────────────────
  
  private translateRequest(msg: PipelineMessage): Anthropic.MessageCreateParams {
    const params = msg.request.params as any;
    const meta = params._meta?.anthropic ?? {};
    
    // Translate ACP content blocks to Anthropic format
    const messages = this.translateMessages(params.prompt);
    
    const request: Anthropic.MessageCreateParams = {
      model: meta.model ?? this.config.defaultModel,
      max_tokens: meta.maxTokens ?? this.config.defaultMaxTokens,
      messages,
      stream: true,
    };
    
    // Add thinking if requested
    if (meta.thinking === 'enabled') {
      request.thinking = {
        type: 'enabled',
        budget_tokens: meta.maxThinkingTokens ?? 10000,
      };
    }
    
    return request;
  }
  
  private translateMessages(prompt: any[]): Anthropic.MessageParam[] {
    // Convert ACP ContentBlocks to Anthropic format
    const content: Anthropic.ContentBlockParam[] = prompt.map(block => {
      switch (block.type) {
        case 'text':
          return { type: 'text', text: block.text };
        case 'image':
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: block.mimeType,
              data: block.data,
            },
          };
        case 'resource':
          // Embed resource as text
          return {
            type: 'text',
            text: `<file uri="${block.resource.uri}">\n${block.resource.text}\n</file>`,
          };
        default:
          return { type: 'text', text: JSON.stringify(block) };
      }
    });
    
    return [{ role: 'user', content }];
  }
  
  // ─────────────────────────────────────────────────────────────
  // Anthropic → ACP Translation (Streaming)
  // ─────────────────────────────────────────────────────────────
  
  async *processStream(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): StreamingResult {
    const msg = inputs.in?.[0];
    if (!msg) return;
    
    const anthropicRequest = this.translateRequest(msg);
    const stream = this.client.messages.stream(anthropicRequest);
    
    let thinkingBuffer = '';
    let textBuffer = '';
    
    for await (const event of stream) {
      yield* this.translateEvent(event, ctx, { thinkingBuffer, textBuffer });
    }
    
    // Final message with usage
    const finalMessage = await stream.finalMessage();
    yield this.translateUsage(finalMessage, ctx);
  }
  
  private *translateEvent(
    event: Anthropic.MessageStreamEvent,
    ctx: PipelineContext,
    buffers: { thinkingBuffer: string; textBuffer: string }
  ): Generator<ACPNotification> {
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta.type === 'thinking_delta') {
          yield {
            method: 'session/update',
            params: {
              sessionId: ctx.sessionId,
              update: {
                type: 'thought_chunk',
                content: {
                  type: 'text',
                  text: event.delta.thinking,
                },
                _meta: {
                  anthropic: {
                    thinkingBlockIndex: event.index,
                  },
                },
              },
            },
          };
        } else if (event.delta.type === 'text_delta') {
          yield {
            method: 'session/update',
            params: {
              sessionId: ctx.sessionId,
              update: {
                type: 'content_chunk',
                content: {
                  type: 'text',
                  text: event.delta.text,
                },
              },
            },
          };
        }
        break;
        
      case 'content_block_start':
        if (event.content_block.type === 'tool_use') {
          yield {
            method: 'session/update',
            params: {
              sessionId: ctx.sessionId,
              update: {
                type: 'tool_call_start',
                toolCall: {
                  id: event.content_block.id,
                  name: event.content_block.name,
                },
              },
            },
          };
        }
        break;
    }
  }
  
  private translateUsage(
    message: Anthropic.Message,
    ctx: PipelineContext
  ): ACPNotification {
    return {
      method: 'session/update',
      params: {
        sessionId: ctx.sessionId,
        update: {
          type: 'usage',
          _meta: {
            proxy: {
              usage: {
                inputTokens: message.usage.input_tokens,
                outputTokens: message.usage.output_tokens,
              },
            },
            anthropic: {
              cacheReadInputTokens: (message.usage as any).cache_read_input_tokens,
              cacheCreationInputTokens: (message.usage as any).cache_creation_input_tokens,
            },
          },
        },
      },
    };
  }
  
  // Non-streaming fallback
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg) return {};
    
    // Collect stream and forward updates
    for await (const notification of this.processStream(inputs, ctx)) {
      ctx.onUpdate?.(notification);
    }
    
    return { out: msg };
  }
}
```

```typescript
// src/nodes/adapters/openai.ts

import { ClassicPreset } from 'rete';
import OpenAI from 'openai';
import { StreamingNode } from '../base';
import { Sockets } from '../../sockets';
import type { 
  PipelineMessage, 
  PipelineContext, 
  ACPNotification,
  StreamingResult 
} from '../../types';

interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel: string;
}

export class OpenAIAdapterNode extends StreamingNode {
  private client: OpenAI;
  private config: OpenAIConfig;
  
  constructor(config: OpenAIConfig) {
    super('OpenAI Adapter');
    this.config = config;
    this.client = new OpenAI({ 
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.Pipeline, 'Output'));
  }
  
  private translateRequest(msg: PipelineMessage): OpenAI.Responses.ResponseCreateParams {
    const params = msg.request.params as any;
    const meta = params._meta?.openai ?? {};
    
    const request: OpenAI.Responses.ResponseCreateParams = {
      model: meta.model ?? this.config.defaultModel,
      input: this.translateInput(params.prompt),
      stream: true,
    };
    
    // Add reasoning if requested
    if (meta.reasoning) {
      request.reasoning = {
        effort: meta.reasoning.effort ?? 'medium',
        summary: meta.reasoning.summary,
      };
    }
    
    // Add built-in tools
    if (meta.builtinTools) {
      request.tools = meta.builtinTools;
    }
    
    return request;
  }
  
  private translateInput(prompt: any[]): OpenAI.Responses.ResponseInputItem[] {
    const content = prompt.map(block => {
      if (block.type === 'text') {
        return { type: 'input_text' as const, text: block.text };
      }
      if (block.type === 'image') {
        return { 
          type: 'input_image' as const, 
          image_url: `data:${block.mimeType};base64,${block.data}`,
        };
      }
      return { type: 'input_text' as const, text: JSON.stringify(block) };
    });
    
    return [{
      type: 'message',
      role: 'user',
      content,
    }];
  }
  
  async *processStream(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): StreamingResult {
    const msg = inputs.in?.[0];
    if (!msg) return;
    
    const openaiRequest = this.translateRequest(msg);
    const stream = await this.client.responses.create(openaiRequest);
    
    for await (const event of stream) {
      yield* this.translateEvent(event, ctx);
    }
  }
  
  private *translateEvent(
    event: any,  // OpenAI streaming event
    ctx: PipelineContext
  ): Generator<ACPNotification> {
    // Handle different event types
    if (event.type === 'response.output_text.delta') {
      yield {
        method: 'session/update',
        params: {
          sessionId: ctx.sessionId,
          update: {
            type: 'content_chunk',
            content: {
              type: 'text',
              text: event.delta,
            },
          },
        },
      };
    }
    
    if (event.type === 'response.reasoning_summary_text.delta') {
      yield {
        method: 'session/update',
        params: {
          sessionId: ctx.sessionId,
          update: {
            type: 'thought_chunk',
            content: {
              type: 'text',
              text: event.delta,
            },
            _meta: {
              openai: {
                reasoningSummary: true,
              },
            },
          },
        },
      };
    }
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg) return {};
    
    for await (const notification of this.processStream(inputs, ctx)) {
      ctx.onUpdate?.(notification);
    }
    
    return { out: msg };
  }
}
```

---

## 8. Transform Nodes

```typescript
// src/nodes/transform/meta-injector.ts

import { ClassicPreset } from 'rete';
import { AcphosNode } from '../base';
import { Sockets } from '../../sockets';
import type { PipelineMessage, PipelineContext } from '../../types';

interface MetaInjectorConfig {
  proxy: {
    version: string;
  };
  defaults: Record<string, unknown>;
}

export class MetaInjectorNode extends AcphosNode {
  config: MetaInjectorConfig;
  
  constructor(config: MetaInjectorConfig) {
    super('Meta Injector');
    this.config = config;
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.Pipeline, 'Output'));
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg) return {};
    
    // Inject proxy metadata
    ctx.meta.proxy = {
      ...this.config.proxy,
      requestId: ctx.requestId,
      startTime: ctx.startTime,
    };
    
    // Merge default backend settings
    const params = msg.request.params as any;
    params._meta = {
      ...this.config.defaults,
      ...params._meta,
      proxy: ctx.meta.proxy,
    };
    
    return { out: msg };
  }
}
```

```typescript
// src/nodes/transform/usage-aggregator.ts

import { ClassicPreset } from 'rete';
import { AcphosNode } from '../base';
import { Sockets } from '../../sockets';
import type { PipelineMessage, PipelineContext, ACPNotification } from '../../types';

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export class UsageAggregatorNode extends AcphosNode {
  private sessionUsage: Map<string, UsageData> = new Map();
  
  constructor() {
    super('Usage Aggregator');
    
    this.addInput('in', new ClassicPreset.Input(Sockets.Pipeline, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.Pipeline, 'Output'));
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, PipelineMessage>> {
    const msg = inputs.in?.[0];
    if (!msg || !ctx.sessionId) return { out: msg! };
    
    // Initialize session usage
    if (!this.sessionUsage.has(ctx.sessionId)) {
      this.sessionUsage.set(ctx.sessionId, {
        inputTokens: 0,
        outputTokens: 0,
      });
    }
    
    // Update will be called via ctx.onUpdate - we intercept usage updates
    const originalOnUpdate = ctx.onUpdate;
    ctx.onUpdate = (notification: ACPNotification) => {
      if (notification.params?.update?.type === 'usage') {
        this.aggregateUsage(ctx.sessionId!, notification);
      }
      originalOnUpdate?.(notification);
    };
    
    return { out: msg };
  }
  
  private aggregateUsage(sessionId: string, notification: ACPNotification) {
    const usage = this.sessionUsage.get(sessionId)!;
    const update = notification.params?.update?._meta?.proxy?.usage;
    
    if (update) {
      usage.inputTokens += update.inputTokens ?? 0;
      usage.outputTokens += update.outputTokens ?? 0;
      usage.thinkingTokens = (usage.thinkingTokens ?? 0) + (update.thinkingTokens ?? 0);
    }
  }
  
  getSessionUsage(sessionId: string): UsageData | undefined {
    return this.sessionUsage.get(sessionId);
  }
}
```

---

## 9. Output Nodes

```typescript
// src/nodes/output/acp-responder.ts

import { ClassicPreset } from 'rete';
import { AcphosNode } from '../base';
import { Sockets } from '../../sockets';
import type { PipelineMessage, PipelineContext, ACPResponse } from '../../types';

export class ACPResponderNode extends AcphosNode {
  private responseCallback?: (response: ACPResponse) => void;
  
  constructor() {
    super('ACP Responder');
    
    this.addInput('success', new ClassicPreset.Input(Sockets.Pipeline, 'Success'));
    this.addInput('error', new ClassicPreset.Input(Sockets.Pipeline, 'Error'));
  }
  
  setResponseCallback(cb: (response: ACPResponse) => void) {
    this.responseCallback = cb;
  }
  
  async process(
    inputs: Record<string, PipelineMessage[]>,
    ctx: PipelineContext
  ): Promise<Record<string, unknown>> {
    const successMsg = inputs.success?.[0];
    const errorMsg = inputs.error?.[0];
    
    if (errorMsg) {
      this.responseCallback?.({
        id: errorMsg.request.id,
        error: {
          code: -32000,
          message: 'Backend error',
          data: errorMsg.response,
        },
      });
      return {};
    }
    
    if (successMsg) {
      // Build final response with timing
      const response: ACPResponse = {
        id: successMsg.request.id,
        result: {
          stopReason: 'end_turn',
          _meta: {
            proxy: {
              ...ctx.meta.proxy,
              timing: {
                totalMs: Date.now() - ctx.startTime,
              },
            },
          },
        },
      };
      
      this.responseCallback?.(response);
    }
    
    return {};
  }
}
```

---

## 10. Engine Setup

```typescript
// src/engine/engine.ts

import { NodeEditor, ClassicPreset } from 'rete';
import { DataflowEngine } from 'rete-engine';

import { ACPReceiverNode } from '../nodes/input/acp-receiver';
import { BackendSelectorNode } from '../nodes/routing/backend-selector';
import { AnthropicAdapterNode } from '../nodes/adapters/anthropic';
import { OpenAIAdapterNode } from '../nodes/adapters/openai';
import { MetaInjectorNode } from '../nodes/transform/meta-injector';
import { UsageAggregatorNode } from '../nodes/transform/usage-aggregator';
import { ACPResponderNode } from '../nodes/output/acp-responder';

import type { ACPRequest, ACPResponse, ACPNotification, PipelineContext } from '../types';

type Schemes = ClassicPreset.GetSchemes<
  AcphosNode,
  ClassicPreset.Connection<AcphosNode, AcphosNode>
>;

export class AcphosEngine {
  private editor: NodeEditor<Schemes>;
  private engine: DataflowEngine<Schemes>;
  
  private receiverNode!: ACPReceiverNode;
  private responderNode!: ACPResponderNode;
  
  constructor() {
    this.editor = new NodeEditor<Schemes>();
    this.engine = new DataflowEngine<Schemes>();
    
    this.editor.use(this.engine);
  }
  
  async initialize(config: AcphosConfig) {
    // Create nodes
    this.receiverNode = new ACPReceiverNode();
    const metaInjector = new MetaInjectorNode(config.meta);
    const backendSelector = new BackendSelectorNode(config.backends);
    const anthropicAdapter = new AnthropicAdapterNode(config.anthropic);
    const openaiAdapter = new OpenAIAdapterNode(config.openai);
    const usageAggregator = new UsageAggregatorNode();
    this.responderNode = new ACPResponderNode();
    
    // Add nodes to editor
    await this.editor.addNode(this.receiverNode);
    await this.editor.addNode(metaInjector);
    await this.editor.addNode(backendSelector);
    await this.editor.addNode(anthropicAdapter);
    await this.editor.addNode(openaiAdapter);
    await this.editor.addNode(usageAggregator);
    await this.editor.addNode(this.responderNode);
    
    // Connect the graph
    // Receiver → MetaInjector → BackendSelector
    await this.editor.addConnection(
      new ClassicPreset.Connection(this.receiverNode, 'request', metaInjector, 'in')
    );
    await this.editor.addConnection(
      new ClassicPreset.Connection(metaInjector, 'out', backendSelector, 'in')
    );
    
    // BackendSelector → Adapters
    await this.editor.addConnection(
      new ClassicPreset.Connection(backendSelector, 'anthropic', anthropicAdapter, 'in')
    );
    await this.editor.addConnection(
      new ClassicPreset.Connection(backendSelector, 'openai', openaiAdapter, 'in')
    );
    
    // Adapters → UsageAggregator → Responder
    await this.editor.addConnection(
      new ClassicPreset.Connection(anthropicAdapter, 'out', usageAggregator, 'in')
    );
    await this.editor.addConnection(
      new ClassicPreset.Connection(openaiAdapter, 'out', usageAggregator, 'in')
    );
    await this.editor.addConnection(
      new ClassicPreset.Connection(usageAggregator, 'out', this.responderNode, 'success')
    );
  }
  
  // ─────────────────────────────────────────────────────────────
  // Process incoming ACP request
  // ─────────────────────────────────────────────────────────────
  
  async processRequest(
    request: ACPRequest,
    onUpdate: (notification: ACPNotification) => void,
    onResponse: (response: ACPResponse) => void
  ): Promise<void> {
    // Set up response callback
    this.responderNode.setResponseCallback(onResponse);
    
    // Inject the request into the graph
    const pipelineMessage = this.receiverNode.injectMessage(request, onUpdate);
    
    // Process the dataflow
    await this.engine.fetch(this.responderNode.id);
  }
  
  // ─────────────────────────────────────────────────────────────
  // Graph serialization (for visual editor)
  // ─────────────────────────────────────────────────────────────
  
  exportGraph(): string {
    return JSON.stringify({
      nodes: Array.from(this.editor.getNodes()),
      connections: Array.from(this.editor.getConnections()),
    });
  }
  
  async importGraph(json: string): Promise<void> {
    const data = JSON.parse(json);
    // Reconstruct graph from serialized data
    // ...implementation
  }
}

// ─────────────────────────────────────────────────────────────
// Config type
// ─────────────────────────────────────────────────────────────

interface AcphosConfig {
  meta: {
    proxy: { version: string };
    defaults: Record<string, unknown>;
  };
  backends: {
    defaultBackend: string;
    backends: Record<string, any>;
  };
  anthropic: {
    apiKey?: string;
    defaultModel: string;
    defaultMaxTokens: number;
  };
  openai: {
    apiKey?: string;
    baseURL?: string;
    defaultModel: string;
  };
}
```

---

## 11. Transport Integration

```typescript
// src/transport/stdio.ts

import * as readline from 'readline';
import { AcphosEngine } from '../engine/engine';
import type { ACPRequest, ACPResponse, ACPNotification } from '../types';

export class StdioTransport {
  private engine: AcphosEngine;
  private rl: readline.Interface;
  
  constructor(engine: AcphosEngine) {
    this.engine = engine;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }
  
  start() {
    let buffer = '';
    let contentLength = 0;
    
    this.rl.on('line', (line) => {
      if (line.startsWith('Content-Length:')) {
        contentLength = parseInt(line.slice(15).trim(), 10);
      } else if (line === '' && contentLength > 0) {
        // Read the JSON body
        // (simplified - real impl needs proper buffering)
      } else if (contentLength > 0) {
        buffer += line;
        if (buffer.length >= contentLength) {
          this.handleMessage(buffer.slice(0, contentLength));
          buffer = buffer.slice(contentLength);
          contentLength = 0;
        }
      }
    });
  }
  
  private async handleMessage(json: string) {
    const request: ACPRequest = JSON.parse(json);
    
    await this.engine.processRequest(
      request,
      (notification) => this.sendNotification(notification),
      (response) => this.sendResponse(response)
    );
  }
  
  private sendResponse(response: ACPResponse) {
    this.sendJson(response);
  }
  
  private sendNotification(notification: ACPNotification) {
    this.sendJson(notification);
  }
  
  private sendJson(data: unknown) {
    const json = JSON.stringify(data);
    const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
    process.stdout.write(header + json);
  }
}
```

---

## 12. Visual Editor Integration (Optional)

```typescript
// src/editor/visual.ts

import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { DataflowEngine } from 'rete-engine';
import { createRoot } from 'react-dom/client';

export async function createVisualEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });
  const engine = new DataflowEngine<Schemes>();
  
  // Configure plugins
  render.addPreset(ReactPresets.classic.setup());
  connection.addPreset(ConnectionPresets.classic.setup());
  
  editor.use(area);
  area.use(connection);
  area.use(render);
  editor.use(engine);
  
  // Enable features
  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl(),
  });
  AreaExtensions.simpleNodesOrder(area);
  AreaExtensions.zoomAt(area, editor.getNodes());
  
  return { editor, area, engine };
}
```

---

## 13. Example Graph Configuration

```json
// graphs/default.json
{
  "version": "1.0.0",
  "nodes": [
    {
      "id": "receiver",
      "type": "ACPReceiver",
      "position": { "x": 0, "y": 200 }
    },
    {
      "id": "meta",
      "type": "MetaInjector",
      "config": {
        "proxy": { "version": "0.1.0" }
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "selector",
      "type": "BackendSelector",
      "config": {
        "defaultBackend": "anthropic",
        "backends": {
          "anthropic": {
            "features": { "thinking": true, "caching": true }
          },
          "openai": {
            "features": { "reasoning": true, "builtinTools": true }
          },
          "ollama": {
            "features": {}
          }
        }
      },
      "position": { "x": 500, "y": 200 }
    },
    {
      "id": "anthropic",
      "type": "AnthropicAdapter",
      "config": {
        "defaultModel": "claude-sonnet-4-20250514",
        "defaultMaxTokens": 8192
      },
      "position": { "x": 800, "y": 100 }
    },
    {
      "id": "openai",
      "type": "OpenAIAdapter",
      "config": {
        "defaultModel": "gpt-4.1"
      },
      "position": { "x": 800, "y": 300 }
    },
    {
      "id": "ollama",
      "type": "OllamaAdapter",
      "config": {
        "baseUrl": "http://localhost:11434",
        "defaultModel": "llama3.1:8b"
      },
      "position": { "x": 800, "y": 500 }
    },
    {
      "id": "usage",
      "type": "UsageAggregator",
      "position": { "x": 1100, "y": 200 }
    },
    {
      "id": "responder",
      "type": "ACPResponder",
      "position": { "x": 1350, "y": 200 }
    }
  ],
  "connections": [
    { "from": "receiver:request", "to": "meta:in" },
    { "from": "meta:out", "to": "selector:in" },
    { "from": "selector:anthropic", "to": "anthropic:in" },
    { "from": "selector:openai", "to": "openai:in" },
    { "from": "selector:ollama", "to": "ollama:in" },
    { "from": "anthropic:out", "to": "usage:in" },
    { "from": "openai:out", "to": "usage:in" },
    { "from": "ollama:out", "to": "usage:in" },
    { "from": "usage:out", "to": "responder:success" }
  ]
}
```

---

## 14. Running Acphos

```typescript
// src/index.ts

import { AcphosEngine } from './engine/engine';
import { StdioTransport } from './transport/stdio';
import { loadConfig } from './config/loader';

async function main() {
  const config = await loadConfig('./acphos.toml');
  
  const engine = new AcphosEngine();
  await engine.initialize(config);
  
  // Optionally load a custom graph
  if (config.graphFile) {
    const graphJson = await fs.readFile(config.graphFile, 'utf-8');
    await engine.importGraph(graphJson);
  }
  
  // Start the transport
  const transport = new StdioTransport(engine);
  transport.start();
  
  console.error('Acphos started on stdio');
}

main().catch(console.error);
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **Input Nodes** | Receive ACP messages from transports |
| **Routing Nodes** | Select backends based on capabilities/_meta |
| **Adapter Nodes** | Translate ACP ↔ native formats, handle streaming |
| **Transform Nodes** | Inject metadata, aggregate usage, transform content |
| **Output Nodes** | Send final ACP responses back |

The graph is:
1. **Configurable** via JSON
2. **Visually editable** when needed
3. **Headless-capable** for production
4. **Streaming-native** for LLM responses
5. **Extensible** — add new backends by creating adapter nodes
