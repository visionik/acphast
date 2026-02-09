# Acphast Pi API Module Specification

**Version:** 1.0  
**Date:** 2026-02-09  
**Status:** Draft

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Goals](#background--goals)
3. [Architecture Overview](#architecture-overview)
4. [Pi RPC Protocol Specification](#pi-rpc-protocol-specification)
5. [Component Specifications](#component-specifications)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Dependencies & Requirements](#dependencies--requirements)
9. [Examples & Usage](#examples--usage)
10. [Appendices](#appendices)

---

## Executive Summary

This specification defines the integration of Pi CLI's RPC API into the Acphast (Agent Client Protocol Heterogeneous Adapter Streaming Transceiver) system. The integration will enable Acphast to communicate directly with the Pi CLI tool's streaming API without using the pi-acp adapter as an intermediary.

**Key Deliverables:**
- Pi RPC client implementation (process management + JSON-RPC protocol)
- Three-node pipeline: PiTranslatorNode → PiClientNode → PiNormalizerNode
- Frontend integration (node palette, visual markers, example graphs)
- Comprehensive test suite
- Documentation and examples

**Architecture Pattern:** Follows existing OpenAI/Anthropic adapter patterns using disaggregated node pipelines with RxJS Observable streams.

---

## Background & Goals

### Current State

**Existing Adapters:**
- **Anthropic**: `packages/nodes/src/anthropic/` (translator, client, normalizer)
- **OpenAI**: `packages/nodes/src/openai/` (translator, client, normalizer)

Both use HTTP-based APIs with streaming responses.

### Problem Statement

Acphast currently lacks support for the Pi CLI tool, which provides:
- Local LLM interface with multiple provider support
- Session management and conversation history
- Thinking mode controls (off, minimal, low, medium, high, xhigh)
- Context compaction capabilities
- Slash command extensibility

### Goals

1. **Primary**: Enable Acphast to communicate with Pi CLI's RPC API directly
2. **Secondary**: Maintain consistency with existing adapter patterns
3. **Tertiary**: Support Pi-specific features (thinking levels, compaction, session management)

### Non-Goals

- Creating a wrapper around pi-acp (we want direct Pi CLI communication)
- Supporting Pi's HTTP mode (only RPC mode via stdin/stdout)
- Reimplementing Pi's session storage (use Pi's native session management)

---

## Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                     Acphast System                      │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────┐  │
│  │   ACP Input  │───▶│  Pi Pipeline │──▶│ ACP Out  │  │
│  └──────────────┘    └──────────────┘   └──────────┘  │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Pi CLI (RPC)  │
                    │  --mode rpc    │
                    └────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Pi Pipeline Nodes                        │
│                                                              │
│  ┌──────────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │ PiTranslatorNode │──▶│ PiClientNode │──▶│ PiNormalizer│ │
│  │                  │   │              │   │    Node     │ │
│  │  ACP → Pi RPC    │   │  Process Mgr │   │ Pi → ACP    │ │
│  │  format          │   │  Event Stream│   │  format     │ │
│  └──────────────────┘   └──────────────┘   └─────────────┘ │
│                                │                             │
│                                ▼                             │
│                       ┌─────────────────┐                    │
│                       │  PiRpcClient    │                    │
│                       │  (rpc-client.ts)│                    │
│                       │                 │                    │
│                       │ • spawn process │                    │
│                       │ • JSON-RPC      │                    │
│                       │ • event handler │                    │
│                       └─────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
ACP Request
    │
    ▼
PipelineMessage { request: ACPRequest, ctx: PipelineContext }
    │
    ▼
PiTranslatorNode
    │ (adds message.translated = { message, attachments, config })
    ▼
PiClientNode
    │ (spawns pi process, sends prompt, streams events)
    │ (calls ctx.onUpdate for each chunk)
    │ (adds message.response = { rawEvents, fullText, stopReason })
    ▼
PiNormalizerNode
    │ (normalizes to ACP format)
    ▼
PipelineMessage { response: ACPResponse }
```

---

## Pi RPC Protocol Specification

### Protocol Overview

- **Transport**: Process stdin/stdout
- **Format**: Line-delimited JSON
- **Pattern**: Command/response with event streaming

### Process Spawning

**Command:**
```bash
pi --mode rpc [--session <path>]
```

**Arguments:**
- `--mode rpc`: Enable RPC mode (required)
- `--session <path>`: Persist session to file (optional)

**Working Directory**: Set via `spawn()` options

### Message Format

#### Command Structure

```typescript
{
  type: string;        // Command type (e.g., 'prompt', 'abort', 'get_state')
  id?: string;         // Request ID (UUID v4) for response correlation
  ...params           // Command-specific parameters
}
```

#### Response Structure

```typescript
{
  type: 'response';
  id?: string;         // Matches request ID
  command: string;     // Original command type
  success: boolean;    // Success/failure indicator
  data?: unknown;      // Response data (if success)
  error?: string;      // Error message (if !success)
}
```

#### Event Structure

```typescript
{
  type: string;        // Event type (e.g., 'chunk', 'thinking', 'tool_use')
  ...eventData        // Event-specific fields
}
```

### Supported Commands

#### 1. prompt
Send a prompt to Pi.

**Request:**
```json
{
  "type": "prompt",
  "id": "req-uuid",
  "message": "Hello, Pi!",
  "attachments": []
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "prompt",
  "success": true
}
```

**Events:** Emits streaming events during generation.

#### 2. abort
Stop current generation.

**Request:**
```json
{
  "type": "abort",
  "id": "req-uuid"
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "abort",
  "success": true
}
```

#### 3. get_state
Get current Pi state.

**Request:**
```json
{
  "type": "get_state",
  "id": "req-uuid"
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "get_state",
  "success": true,
  "data": {
    "sessionFile": "/path/to/.pi/sessions/abc123.json",
    "model": { "provider": "anthropic", "modelId": "claude-3-5-sonnet-20241022" },
    "thinkingLevel": "medium"
  }
}
```

#### 4. get_available_models
List available models.

**Request:**
```json
{
  "type": "get_available_models",
  "id": "req-uuid"
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [
      { "provider": "anthropic", "modelId": "claude-3-5-sonnet-20241022" },
      { "provider": "openai", "modelId": "gpt-4" }
    ]
  }
}
```

#### 5. set_model
Set active model.

**Request:**
```json
{
  "type": "set_model",
  "id": "req-uuid",
  "provider": "anthropic",
  "modelId": "claude-3-5-sonnet-20241022"
}
```

#### 6. set_thinking_level
Set thinking mode.

**Request:**
```json
{
  "type": "set_thinking_level",
  "id": "req-uuid",
  "level": "medium"
}
```

**Levels:** `"off" | "minimal" | "low" | "medium" | "high" | "xhigh"`

#### 7. compact
Compact conversation context.

**Request:**
```json
{
  "type": "compact",
  "id": "req-uuid",
  "customInstructions": "Keep technical details"
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "compact",
  "success": true,
  "data": {
    "tokensBefore": 50000,
    "tokensAfter": 15000,
    "summary": "Compaction summary..."
  }
}
```

#### 8. set_auto_compaction
Toggle automatic compaction.

**Request:**
```json
{
  "type": "set_auto_compaction",
  "id": "req-uuid",
  "enabled": true
}
```

#### 9. get_session_stats
Get session statistics.

**Request:**
```json
{
  "type": "get_session_stats",
  "id": "req-uuid"
}
```

**Response:**
```json
{
  "type": "response",
  "id": "req-uuid",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionId": "abc123",
    "sessionFile": "/path/to/.pi/sessions/abc123.json",
    "totalMessages": 42,
    "cost": 0.0523,
    "tokens": { "input": 25000, "output": 8000 }
  }
}
```

#### 10. export_html
Export session to HTML.

**Request:**
```json
{
  "type": "export_html",
  "id": "req-uuid",
  "outputPath": "/optional/path/output.html"
}
```

#### 11. switch_session
Switch to different session file.

**Request:**
```json
{
  "type": "switch_session",
  "id": "req-uuid",
  "sessionPath": "/path/to/session.json"
}
```

#### 12. get_messages
Get conversation history.

**Request:**
```json
{
  "type": "get_messages",
  "id": "req-uuid"
}
```

### Event Types

Pi emits various event types during operation. Common events include:

#### text_chunk
```json
{
  "type": "text_chunk",
  "text": "Generated text content..."
}
```

#### thinking_chunk
```json
{
  "type": "thinking_chunk",
  "text": "Extended thinking content..."
}
```

#### generation_complete
```json
{
  "type": "generation_complete",
  "stopReason": "end_turn",
  "usage": {
    "inputTokens": 1500,
    "outputTokens": 800
  }
}
```

---

## Component Specifications

### 1. PiRpcClient (rpc-client.ts)

**Location:** `packages/nodes/src/pi/rpc-client.ts`

**Purpose:** Low-level Pi RPC protocol client.

#### Interface

```typescript
export interface PiRpcClientConfig {
  /** Working directory for pi process */
  cwd: string;
  
  /** Pi command override (default: 'pi') */
  piCommand?: string;
  
  /** Session file path for persistence */
  sessionPath?: string;
}

export interface PiRpcCommand {
  type: string;
  id?: string;
  [key: string]: unknown;
}

export interface PiRpcResponse {
  type: 'response';
  id?: string;
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export type PiRpcEvent = Record<string, unknown>;

export class PiRpcClient {
  constructor(config: PiRpcClientConfig);
  
  /** Spawn Pi process */
  static async spawn(config: PiRpcClientConfig): Promise<PiRpcClient>;
  
  /** Register event handler */
  onEvent(handler: (event: PiRpcEvent) => void): () => void;
  
  /** Send command and await response */
  async request(command: PiRpcCommand): Promise<PiRpcResponse>;
  
  /** Send prompt (convenience method) */
  async prompt(message: string, attachments?: unknown[]): Promise<void>;
  
  /** Abort current generation */
  async abort(): Promise<void>;
  
  /** Get current state */
  async getState(): Promise<unknown>;
  
  /** Get available models */
  async getAvailableModels(): Promise<unknown>;
  
  /** Set active model */
  async setModel(provider: string, modelId: string): Promise<void>;
  
  /** Set thinking level */
  async setThinkingLevel(level: ThinkingLevel): Promise<void>;
  
  /** Compact context */
  async compact(customInstructions?: string): Promise<unknown>;
  
  /** Get session stats */
  async getSessionStats(): Promise<unknown>;
  
  /** Terminate process */
  async terminate(): Promise<void>;
}

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
```

#### Implementation Details

**Process Management:**
- Use `child_process.spawn()`
- Pipe stdin/stdout for JSON communication
- Handle stderr separately (logging/debugging)
- Graceful shutdown on terminate()

**Protocol Handling:**
- Generate UUID v4 for request IDs
- Maintain pending request map for response correlation
- Parse line-delimited JSON from stdout
- Distinguish responses from events (responses have matching ID)
- Handle malformed JSON gracefully

**Error Handling:**
- Process exit → reject all pending requests
- Spawn failure → throw error
- Command failure → throw with error message from response

**Event Streaming:**
- Multiple event handlers supported (array)
- Unsubscribe via returned cleanup function

### 2. PiTranslatorNode (translator.ts)

**Location:** `packages/nodes/src/pi/translator.ts`

**Purpose:** Convert ACP request to Pi RPC format.

#### Interface

```typescript
export interface PiTranslatorConfig extends Record<string, unknown> {
  /** Default thinking level */
  defaultThinkingLevel?: ThinkingLevel;
  
  /** Default model provider */
  defaultProvider?: string;
  
  /** Default model ID */
  defaultModel?: string;
}

export interface PiTranslatedRequest {
  /** Prompt message text */
  message: string;
  
  /** Attachments (images, files, etc.) */
  attachments: unknown[];
  
  /** Thinking level */
  thinkingLevel?: ThinkingLevel;
  
  /** Model selection */
  model?: {
    provider: string;
    modelId: string;
  };
}

export class PiTranslatorNode extends AcphastNode {
  constructor(config: PiTranslatorConfig);
  
  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>>;
}
```

#### Translation Logic

**Input:** `PipelineMessage` with `request: ACPRequest`

**Output:** `PipelineMessage` with `translated: PiTranslatedRequest`

**Mapping:**
1. Extract prompt text from `request.params.prompt`
2. Extract attachments (images, files) from prompt content
3. Extract Pi-specific config from `request.params._meta.pi`
4. Apply defaults from node config
5. Set `message.backend = 'pi'`

**Example:**
```typescript
// Input ACP request
{
  method: 'agent/prompt',
  params: {
    prompt: [
      { type: 'text', text: 'Explain async/await' }
    ],
    _meta: {
      pi: {
        thinkingLevel: 'high',
        model: { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' }
      }
    }
  }
}

// Output translated request
{
  message: 'Explain async/await',
  attachments: [],
  thinkingLevel: 'high',
  model: { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' }
}
```

### 3. PiClientNode (client.ts)

**Location:** `packages/nodes/src/pi/client.ts`

**Purpose:** Spawn Pi process, send prompts, stream events.

#### Interface

```typescript
export interface PiClientConfig extends Record<string, unknown> {
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  
  /** Pi command override */
  piCommand?: string;
  
  /** Session file path */
  sessionPath?: string;
  
  /** Auto-spawn on first message (default: true) */
  autoSpawn?: boolean;
}

export interface PiRawResponse {
  /** All events received */
  events: PiRpcEvent[];
  
  /** Accumulated text */
  fullText: string;
  
  /** Stop reason */
  stopReason: string | null;
  
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class PiClientNode extends StreamingNode {
  constructor(config: PiClientConfig);
  
  processStream(
    message: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage>;
  
  /** Lifecycle: cleanup on node removal */
  override onRemoved(): void;
}
```

#### Implementation Details

**Lifecycle:**
- Lazy spawn: Create `PiRpcClient` on first `processStream()` call
- Reuse process across multiple requests
- Terminate process in `onRemoved()`

**Stream Processing:**
1. Get/spawn Pi client
2. Extract `message.translated` (PiTranslatedRequest)
3. Apply model/thinking level settings if specified
4. Register event handler
5. Send prompt via `client.prompt()`
6. Accumulate events and text
7. Stream text chunks via `ctx.onUpdate()`
8. On completion, emit final message with `response: PiRawResponse`

**Event Handling:**
- Map Pi event types to ACP session update types
- Handle `text_chunk` → ACP content_chunk
- Handle `thinking_chunk` → ACP thinking content
- Handle `generation_complete` → extract stop reason and usage

**Error Handling:**
- Process exit → error stream
- Prompt failure → error stream
- Abort support via `client.abort()` (future enhancement)

### 4. PiNormalizerNode (normalizer.ts)

**Location:** `packages/nodes/src/pi/normalizer.ts`

**Purpose:** Convert Pi raw response to ACP format.

#### Interface

```typescript
export interface PiNormalizerConfig extends Record<string, unknown> {
  /** Include raw events in normalized response */
  includeRawEvents?: boolean;
}

export class PiNormalizerNode extends AcphastNode {
  constructor(config: PiNormalizerConfig);
  
  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>>;
}
```

#### Normalization Logic

**Input:** `PipelineMessage` with `response: PiRawResponse`

**Output:** `PipelineMessage` with normalized ACP response

**Mapping:**
1. Extract `fullText` → ACP content blocks
2. Map `stopReason` → ACP stop reason
3. Extract usage → ACP token usage
4. Optionally preserve raw events in `_meta.pi.rawEvents`

---

## Implementation Phases

### Phase 1: Core RPC Client (Foundation)
**Dependencies:** None  
**Estimated Effort:** 4-6 hours

#### Tasks:
1. **Create directory structure**
   - `packages/nodes/src/pi/`
   - Create `index.ts` barrel export

2. **Implement PiRpcClient**
   - `rpc-client.ts` implementation
   - Process spawning with `child_process.spawn()`
   - stdin/stdout line-delimited JSON handling
   - Request/response correlation
   - Event handler registry
   - Command methods (prompt, abort, getState, etc.)

3. **Type definitions**
   - `PiRpcCommand` union type
   - `PiRpcResponse` interface
   - `PiRpcEvent` type
   - `PiRpcClientConfig` interface

4. **Error handling**
   - Process exit handling
   - Command failure handling
   - Malformed JSON handling

**Deliverables:**
- `packages/nodes/src/pi/rpc-client.ts`
- `packages/nodes/src/pi/types.ts`

**Testing:**
- Unit tests for command/response correlation
- Integration tests spawning actual Pi process
- Error handling tests (invalid commands, process exit)

---

### Phase 2: Translator Node
**Dependencies:** Phase 1 (types only)  
**Estimated Effort:** 2-3 hours

#### Tasks:
1. **Implement PiTranslatorNode**
   - `translator.ts` implementation
   - Extend `AcphastNode` base class
   - Extract prompt text from ACP format
   - Extract attachments
   - Handle Pi-specific meta config
   - Apply config defaults

2. **Configuration**
   - `PiTranslatorConfig` interface
   - Default thinking level
   - Default model selection

3. **Type definitions**
   - `PiTranslatedRequest` interface

**Deliverables:**
- `packages/nodes/src/pi/translator.ts`

**Testing:**
- Unit tests for translation logic
- Various ACP prompt formats (text, images, meta config)
- Config default application

---

### Phase 3: Client Node (Process Management + Streaming)
**Dependencies:** Phase 1, Phase 2  
**Estimated Effort:** 6-8 hours

#### Tasks:
1. **Implement PiClientNode**
   - `client.ts` implementation
   - Extend `StreamingNode` base class
   - Lazy process spawning
   - Event handler registration
   - Stream processing with RxJS
   - Text accumulation
   - ACP session update streaming

2. **Configuration**
   - `PiClientConfig` interface
   - CWD, session path, pi command override

3. **Lifecycle management**
   - Spawn on first message
   - Reuse process
   - Cleanup on `onRemoved()`

4. **Event mapping**
   - Pi events → ACP session updates
   - Text chunks → content_chunk
   - Thinking chunks → thinking content
   - Generation complete → stop reason + usage

5. **Type definitions**
   - `PiRawResponse` interface

**Deliverables:**
- `packages/nodes/src/pi/client.ts`

**Testing:**
- Unit tests for event mapping
- Integration tests with real Pi process
- Stream cancellation tests
- Process lifecycle tests
- Error handling (process exit, command failure)

---

### Phase 4: Normalizer Node
**Dependencies:** Phase 3 (types only)  
**Estimated Effort:** 2-3 hours

#### Tasks:
1. **Implement PiNormalizerNode**
   - `normalizer.ts` implementation
   - Extend `AcphastNode` base class
   - Extract text from raw response
   - Map stop reason
   - Extract usage stats
   - Optionally preserve raw events

2. **Configuration**
   - `PiNormalizerConfig` interface
   - `includeRawEvents` option

**Deliverables:**
- `packages/nodes/src/pi/normalizer.ts`

**Testing:**
- Unit tests for normalization logic
- Various Pi response formats
- Raw event preservation

---

### Phase 5: Integration & Exports
**Dependencies:** Phases 1-4  
**Estimated Effort:** 2-3 hours

#### Tasks:
1. **Update exports**
   - `packages/nodes/src/pi/index.ts` barrel export
   - `packages/nodes/src/index.ts` add Pi exports

2. **Node registry**
   - Register Pi nodes in node registry
   - Add node metadata (name, description, category)

3. **Documentation**
   - README.md for Pi pipeline
   - Usage examples
   - Configuration guide

**Deliverables:**
- Updated `packages/nodes/src/index.ts`
- `packages/nodes/src/pi/README.md`

**Testing:**
- Import tests (verify exports)
- Registry tests (verify node registration)

---

### Phase 6: Frontend Integration
**Dependencies:** Phase 5  
**Estimated Effort:** 4-6 hours

#### Tasks:
1. **Visual markers**
   - `packages/nodes/src/markers/` add Pi markers
   - Pi-specific colors/icons

2. **Editor integration**
   - Update node palette to include Pi nodes
   - Update `packages/editor/src/components/NodePalette.tsx`

3. **Example graph**
   - Create `graphs/pi.json`
   - Three-node pipeline example
   - Include config examples

4. **Demo integration**
   - Update `packages/editor/demo/` to showcase Pi

**Deliverables:**
- Updated node palette
- `graphs/pi.json`
- Visual markers

**Testing:**
- Manual testing in editor
- Graph loading/execution
- Visual verification

---

### Phase 7: End-to-End Testing & Documentation
**Dependencies:** Phase 6  
**Estimated Effort:** 4-6 hours

#### Tasks:
1. **Integration tests**
   - Full pipeline test (Translator → Client → Normalizer)
   - Multiple prompts in sequence
   - Model switching
   - Thinking level changes
   - Context compaction

2. **Documentation**
   - Update main README
   - Add Pi API section to architecture docs
   - Create usage examples
   - Add troubleshooting guide

3. **Example scripts**
   - CLI example using Pi pipeline
   - Configuration examples

**Deliverables:**
- Integration test suite
- Documentation updates
- Example scripts

**Testing:**
- End-to-end tests
- Performance benchmarks
- Memory leak tests (process management)

---

## Testing Strategy

### Unit Tests

**Framework:** Vitest

**Coverage Targets:**
- PiRpcClient: 90%+
- PiTranslatorNode: 95%+
- PiClientNode: 85%+
- PiNormalizerNode: 95%+

**Test Categories:**

#### 1. PiRpcClient Tests
```typescript
describe('PiRpcClient', () => {
  it('spawns pi process with correct args');
  it('sends commands as line-delimited JSON');
  it('correlates responses with request IDs');
  it('emits events to registered handlers');
  it('rejects pending requests on process exit');
  it('handles malformed JSON gracefully');
  it('terminates process cleanly');
});
```

#### 2. PiTranslatorNode Tests
```typescript
describe('PiTranslatorNode', () => {
  it('extracts text from ACP prompt');
  it('extracts attachments from prompt');
  it('applies default thinking level');
  it('uses meta.pi config when present');
  it('sets backend to "pi"');
  it('handles empty prompts');
});
```

#### 3. PiClientNode Tests
```typescript
describe('PiClientNode', () => {
  it('lazy spawns Pi process on first message');
  it('reuses process across requests');
  it('maps Pi events to ACP updates');
  it('accumulates text from chunks');
  it('extracts stop reason and usage');
  it('calls ctx.onUpdate for each chunk');
  it('handles process exit gracefully');
  it('terminates process on onRemoved');
});
```

#### 4. PiNormalizerNode Tests
```typescript
describe('PiNormalizerNode', () => {
  it('extracts text from raw response');
  it('maps stop reason correctly');
  it('extracts usage stats');
  it('preserves raw events when configured');
  it('handles missing usage data');
});
```

### Integration Tests

**Test Pi Installation:**
Use test fixtures or mock Pi process for CI environments.

**Test Scenarios:**

#### 1. Full Pipeline Test
```typescript
it('processes request through full pipeline', async () => {
  // Create pipeline: Translator → Client → Normalizer
  // Send ACP request
  // Verify normalized response
});
```

#### 2. Multiple Prompts
```typescript
it('handles multiple sequential prompts', async () => {
  // Send 3 prompts in sequence
  // Verify process reuse
  // Verify responses
});
```

#### 3. Model Switching
```typescript
it('switches models between prompts', async () => {
  // Send prompt with model A
  // Send prompt with model B
  // Verify model changes via get_state
});
```

#### 4. Thinking Levels
```typescript
it('applies thinking level changes', async () => {
  // Send prompt with thinking level
  // Verify thinking chunks in response
});
```

#### 5. Error Handling
```typescript
it('handles Pi process crash', async () => {
  // Start prompt
  // Kill Pi process
  // Verify error handling
});
```

### Manual Testing

**Test Checklist:**

- [ ] Pi process spawns correctly
- [ ] Prompts stream responses
- [ ] Text chunks update in real-time
- [ ] Thinking mode works
- [ ] Model switching works
- [ ] Context compaction works
- [ ] Session persistence works
- [ ] Process cleanup on node removal
- [ ] Editor shows Pi nodes in palette
- [ ] Example graph loads and executes
- [ ] Error messages are clear

---

## Dependencies & Requirements

### System Requirements

**Pi CLI:**
- Version: Latest (compatible with `--mode rpc`)
- Installation: `npm install -g @inflectionai/pi` or system package

**Node.js:**
- Version: ≥20.0.0 (as per existing Acphast requirements)

**Operating System:**
- macOS, Linux, Windows (with WSL for process spawning)

### Package Dependencies

**No new dependencies required.**

Uses existing dependencies:
- `rxjs` (already in Acphast)
- `rete` (already in Acphast)
- `child_process` (Node.js built-in)
- `readline` (Node.js built-in)
- `crypto` (Node.js built-in)

### Development Dependencies

**Testing:**
- `vitest` (already in Acphast)
- `@vitest/coverage-v8` (already in Acphast)

---

## Examples & Usage

### Example 1: Basic Usage

**Graph Configuration (graphs/pi.json):**
```json
{
  "nodes": {
    "translator": {
      "type": "PiTranslatorNode",
      "config": {
        "defaultThinkingLevel": "medium",
        "defaultModel": "claude-3-5-sonnet-20241022",
        "defaultProvider": "anthropic"
      }
    },
    "client": {
      "type": "PiClientNode",
      "config": {
        "cwd": "/path/to/project",
        "sessionPath": "/path/to/.pi/sessions/my-session.json"
      }
    },
    "normalizer": {
      "type": "PiNormalizerNode",
      "config": {
        "includeRawEvents": false
      }
    }
  },
  "connections": [
    { "from": "translator.out", "to": "client.in" },
    { "from": "client.out", "to": "normalizer.in" }
  ]
}
```

### Example 2: High Thinking Mode

**ACP Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "agent/prompt",
  "params": {
    "prompt": [
      { "type": "text", "text": "Explain quantum entanglement" }
    ],
    "_meta": {
      "pi": {
        "thinkingLevel": "xhigh"
      }
    }
  }
}
```

### Example 3: Model Selection

**ACP Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "agent/prompt",
  "params": {
    "prompt": [
      { "type": "text", "text": "Write a poem" }
    ],
    "_meta": {
      "pi": {
        "model": {
          "provider": "openai",
          "modelId": "gpt-4"
        }
      }
    }
  }
}
```

### Example 4: Programmatic Usage

```typescript
import { PiRpcClient } from '@acphast/nodes';

// Create client
const client = await PiRpcClient.spawn({
  cwd: '/path/to/project',
  sessionPath: '/path/to/session.json'
});

// Register event handler
client.onEvent((event) => {
  if (event.type === 'text_chunk') {
    console.log('Received:', event.text);
  }
});

// Send prompt
await client.prompt('Hello, Pi!');

// Get session stats
const stats = await client.getSessionStats();
console.log('Stats:', stats);

// Cleanup
await client.terminate();
```

---

## Appendices

### Appendix A: Pi Event Types Reference

| Event Type | Description | Fields |
|------------|-------------|--------|
| `text_chunk` | Text generation chunk | `text: string` |
| `thinking_chunk` | Extended thinking chunk | `text: string` |
| `generation_complete` | Generation finished | `stopReason: string, usage: object` |
| `tool_use` | Tool invocation | `name: string, input: object` |
| `tool_result` | Tool execution result | `result: unknown, error?: string` |
| `error` | Error occurred | `error: string, code?: string` |

### Appendix B: ACP to Pi Mapping

| ACP Concept | Pi Equivalent |
|-------------|---------------|
| Prompt | `prompt` command |
| Session | Pi session file |
| Model | `set_model` command |
| Thinking | `set_thinking_level` command |
| Stop | `abort` command |
| Streaming update | Pi events |

### Appendix C: Troubleshooting

**Issue: Pi process fails to spawn**
- Verify `pi` command is in PATH
- Check `piCommand` config override
- Verify working directory exists

**Issue: No streaming updates**
- Verify `ctx.onUpdate` is provided
- Check event handler registration
- Verify Pi is emitting events (try `pi --mode rpc` manually)

**Issue: Process doesn't terminate**
- Check for event handler leaks
- Verify `onRemoved()` is called
- Manually call `client.terminate()`

**Issue: Malformed JSON errors**
- Update Pi CLI to latest version
- Check stderr for Pi error messages
- Enable debug logging in PiRpcClient

### Appendix D: Performance Considerations

**Process Reuse:**
- Single Pi process handles multiple requests
- Reduces spawn overhead
- Maintains session context

**Memory Management:**
- Limit event accumulation in PiRawResponse
- Clear event handlers on stream completion
- Terminate process on node removal

**Streaming Efficiency:**
- Events pushed directly to ACP client
- Minimal buffering in client node
- Text accumulation only for final response

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-09 | Warp Agent | Initial specification |

---

**End of Specification**
