# Acphast Implementation Specification

**Version:** 1.0.0  
**Date:** 2026-02-03  
**Status:** Ready for Implementation

## Overview

Acphast (Agent Client Protocol Heterogeneous Adapter Streaming Transceiver) is a universal LLM protocol translator that enables bidirectional translation between any LLM protocol—ACP, Anthropic Messages, OpenAI Responses, Chat Completions, and proprietary WebSocket APIs—without losing provider-specific capabilities.

### Core Value Proposition

- **Universal Translation**: Any client protocol → Any backend protocol
- **Zero Capability Loss**: Provider-specific features preserved via `_meta` extensions
- **Visual Development**: Rete.js-based graph editor for routing configuration
- **Streaming Native**: Full support for real-time token streaming
- **Extensible**: Plugin-style node architecture for custom behaviors

## Requirements

### Functional Requirements

#### MUST Have (MVP)
- Accept ACP requests via stdio (JSON-RPC)
- Route to ACP passthrough adapter (testing) or Anthropic Messages adapter
- Preserve and translate `_meta` extensions bidirectionally
- Stream responses using RxJS observables
- Visual graph editor served on port 6809
- Hot-reload graph changes without restarting proxy
- Load configuration from TOML file
- CLI with git-style subcommands

#### SHOULD Have (Post-MVP)
- Additional backend adapters (OpenAI, Ollama)
- Additional frontend receivers (Messages API, Chat Completions)
- HTTP/SSE transport in addition to stdio
- Retry logic and fallback routing nodes
- Usage aggregation and cost estimation
- Session persistence beyond in-memory

#### MAY Have (Future)
- WebSocket transport
- Multi-backend orchestration (A/B testing, consensus)
- Response caching layer
- OpenTelemetry integration
- Electron packaging

#### MUST NOT
- Store API keys in config files (environment variables only)
- Block streaming responses for processing
- Lose provider-specific metadata during translation

### Non-Functional Requirements

#### Performance
- MUST handle streaming responses with <100ms added latency
- SHOULD support concurrent sessions (multiple clients)
- MUST handle backpressure when consumers slower than LLM

#### Reliability
- MUST retry transient errors (429, 503) with exponential backoff
- MUST pass through permanent errors (400, 401) immediately
- MUST validate graph structure before hot-reload
- SHOULD log all errors to Sentry

#### Security
- MUST NOT expose backend API keys to clients
- MUST validate `_meta` according to configured policy
- SHOULD sanitize logs to avoid leaking secrets

#### Developer Experience
- MUST provide clear error messages with context
- MUST support TypeScript with full type safety
- SHOULD have <5s cold start time for CLI
- MUST have hot-reload for editor changes

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Acphast CLI                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Embedded Web Server (port 6809)                │ │
│  │                   React + Rete.js Editor                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ WebSocket/HTTP                    │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Acphast Engine                           │ │
│  │                                                             │ │
│  │   ┌─────────────────────────────────────────────────────┐  │ │
│  │   │           Rete.js Dataflow Graph                     │  │ │
│  │   │                                                      │  │ │
│  │   │  [Receiver] → [Normalizer] → [Router] → [Adapter]  │  │ │
│  │   │                         ↓                           │  │ │
│  │   │                   [Responder]                       │  │ │
│  │   │                                                      │  │ │
│  │   │  All connections carry RxJS Observables             │  │ │
│  │   └─────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │                                   │
│  ┌──────────────┐   ┌───────▼────────┐   ┌──────────────┐      │
│  │   stdio      │   │  Session       │   │ Graph Hot-   │      │
│  │   Transport  │◄──┤  Repository    │   │ Reload       │      │
│  │   (JSON-RPC) │   │  (in-memory)   │   │ (fs.watch)   │      │
│  └──────────────┘   └────────────────┘   └──────────────┘      │
│         ▲                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
     Client (ACP)
```

### Module Structure (pnpm Workspace)

```
acphast/
├── packages/
│   ├── core/                    # @acphast/core
│   │   ├── src/
│   │   │   ├── types.ts         # Core type definitions
│   │   │   ├── acp.ts           # ACP protocol types
│   │   │   ├── meta.ts          # _meta schemas (Zod)
│   │   │   └── errors.ts        # Error codes and types
│   │   └── package.json
│   │
│   ├── engine/                  # @acphast/engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── graph-engine.ts  # Rete.js + RxJS integration
│   │   │   ├── node-registry.ts
│   │   │   └── hot-reload.ts    # fs.watch based reloader
│   │   └── package.json
│   │
│   ├── nodes/                   # @acphast/nodes
│   │   ├── src/
│   │   │   ├── base/
│   │   │   │   ├── node.ts      # Base node classes
│   │   │   │   └── streaming.ts # RxJS streaming helpers
│   │   │   ├── input/
│   │   │   │   └── acp-receiver.ts
│   │   │   ├── routing/
│   │   │   │   ├── backend-selector.ts
│   │   │   │   └── capability-gate.ts
│   │   │   ├── adapters/
│   │   │   │   ├── acp-passthrough.ts
│   │   │   │   └── anthropic.ts
│   │   │   ├── transform/
│   │   │   │   └── meta-injector.ts
│   │   │   └── output/
│   │   │       └── acp-responder.ts
│   │   └── package.json
│   │
│   ├── transport/               # @acphast/transport
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── stdio.ts         # JSON-RPC over stdio
│   │   └── package.json
│   │
│   ├── session/                 # @acphast/session
│   │   ├── src/
│   │   │   ├── repository.ts    # Abstract interface
│   │   │   └── memory.ts        # In-memory implementation
│   │   └── package.json
│   │
│   └── config/                  # @acphast/config
│       ├── src/
│       │   ├── schema.ts        # TOML schema (Zod)
│       │   └── loader.ts        # Config + env var loading
│       └── package.json
│
├── apps/
│   ├── cli/                     # Main CLI application
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── start.ts     # acphast start
│   │   │   │   ├── editor.ts    # acphast editor
│   │   │   │   ├── init.ts      # acphast init
│   │   │   │   └── validate.ts  # acphast validate
│   │   │   └── server.ts        # Embedded web server
│   │   └── package.json
│   │
│   └── editor/                  # Visual graph editor (React + Vite)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── GraphEditor.tsx    # Rete.js wrapper
│       │   │   ├── NodePalette.tsx
│       │   │   └── PropertiesPanel.tsx
│       │   └── api/
│       │       └── engine-client.ts   # WebSocket to engine
│       ├── index.html
│       └── package.json
│
├── graphs/                      # Default graph definitions
│   ├── default.json
│   └── anthropic-passthrough.json
│
├── pnpm-workspace.yaml
├── package.json                 # Workspace root
├── tsconfig.json                # Base tsconfig
└── acphast.example.toml         # Example configuration
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript | Type safety, rich ecosystem |
| Monorepo | pnpm workspaces | Fast, efficient, native workspace support |
| Graph Engine | Rete.js | Visual editing, dataflow execution |
| Streaming | RxJS | Operators for retry/routing, backpressure |
| Validation | Zod | Runtime validation + TS types |
| Config | TOML (smol-toml) | Human-readable, clear structure |
| CLI | commander | Git-style subcommands |
| Transport | stdio (JSON-RPC) | ACP native, simple protocol |
| Web Server | Hono | Fast, lightweight, embedded in CLI |
| Editor UI | React + Vite | Fast HMR, Rete.js integration |
| Logging | pino + Sentry | Structured logs + error tracking |
| Testing | Vitest | Fast, native ESM support |
| Build | tsx (dev) + tsc (prod) | Simple TypeScript workflow |

## Implementation Plan

### Phase 1: Foundation

**Goal**: Basic project structure, type system, and configuration loading.

**Dependencies**: None

#### Subphase 1.1: Project Setup

**Dependencies**: None

##### Task 1.1.1: Initialize Monorepo
- Create pnpm workspace structure
- Set up `pnpm-workspace.yaml`
- Configure base `tsconfig.json` with paths
- Add root `package.json` with workspace scripts
- **Acceptance**: `pnpm install` works, TypeScript resolves workspace packages

##### Task 1.1.2: Core Package Scaffolding
- Create `packages/core` with initial types
- Define ACP protocol types (`ACPRequest`, `ACPResponse`, `ACPNotification`)
- Define `PipelineMessage` and `PipelineContext` types
- Create error code enums
- **Acceptance**: `@acphast/core` exports compile without errors

##### Task 1.1.3: Development Tooling
- Configure tsx for development
- Set up Vitest for testing
- Add ESLint + Prettier
- Create shared tsconfig for packages
- **Acceptance**: `pnpm test` runs, `pnpm lint` works

#### Subphase 1.2: Configuration System

**Dependencies**: 1.1

##### Task 1.2.1: Config Schema Definition
- Create `packages/config`
- Define TOML schema with Zod
- Include backend configs, graph paths, server settings
- Document all config options
- **Acceptance**: Config schema validates example TOML

##### Task 1.2.2: Config Loader Implementation
- Implement TOML file loading with smol-toml
- Merge environment variables (for API keys)
- Add config validation and error reporting
- **Acceptance**: Loads `acphast.example.toml`, reads `ANTHROPIC_API_KEY` from env

##### Task 1.2.3: Config CLI Command
- Create `apps/cli` package
- Implement `acphast init` command
- Generate `acphast.toml` from prompts
- **Acceptance**: `acphast init` creates valid config file

#### Subphase 1.3: Metadata Schemas

**Dependencies**: 1.1

##### Task 1.3.1: Provider Metadata Schemas
- Create `packages/core/src/meta.ts`
- Define Zod schemas for `anthropic`, `openai`, `ollama`, `proxy` metadata
- Implement configurable validation policy (strict/permissive/strip)
- **Acceptance**: Metadata validates correctly, unknown keys handled per policy

##### Task 1.3.2: Metadata Utilities
- Create merge utilities for `_meta` objects
- Implement extraction from nested content blocks
- Add logging for unknown metadata keys
- **Acceptance**: Unit tests pass for metadata handling

---

### Phase 2: Core Engine

**Goal**: Rete.js graph engine with RxJS streaming support.

**Dependencies**: Phase 1

#### Subphase 2.1: Base Node System

**Dependencies**: Phase 1

##### Task 2.1.1: Base Node Classes
- Create `packages/nodes`
- Implement `AcphastNode` base class with RxJS observables
- Create `StreamingNode` base for LLM adapters
- Create `RouterNode` base for conditional routing
- **Acceptance**: Base classes compile, can be extended

##### Task 2.1.2: Node Registry
- Implement node type registration system
- Add factory functions for creating nodes from JSON
- Create node metadata (name, description, inputs/outputs)
- **Acceptance**: Registry can instantiate nodes by type name

##### Task 2.1.3: Socket Definitions
- Define Rete.js socket types for different data
- Create typed socket helpers for type safety
- **Acceptance**: Sockets enforce type compatibility

#### Subphase 2.2: Graph Engine

**Dependencies**: 2.1

##### Task 2.2.1: Rete.js Integration
- Create `packages/engine`
- Set up Rete.js editor with RxJS dataflow engine
- Implement graph execution with observables
- Handle errors and cancellation
- **Acceptance**: Simple graph executes, observables flow through nodes

##### Task 2.2.2: Graph Serialization
- Implement graph export to JSON
- Implement graph import from JSON
- Validate graph structure (cycles, orphans, type safety)
- **Acceptance**: Graph round-trips through JSON correctly

##### Task 2.2.3: Hot-Reload System
- Implement fs.watch on graph files
- Validate new graph before applying
- Swap graph atomically (new requests use new graph)
- Keep in-flight requests on old graph
- **Acceptance**: Graph changes apply without dropping active sessions

#### Subphase 2.3: Pipeline Context

**Dependencies**: 2.1

##### Task 2.3.1: Context Management
- Implement `PipelineContext` with request ID, session ID, timestamps
- Add structured logging (pino) integration
- Create context propagation through graph
- **Acceptance**: Each request has unique context, logs are correlated

##### Task 2.3.2: Error Handling Pipeline
- Implement error propagation through observables
- Add retry logic for transient errors (RxJS retry operators)
- Route errors to responder node
- **Acceptance**: Errors logged to Sentry, returned to client correctly

---

### Phase 3: Session Management

**Goal**: Abstract session repository with in-memory implementation.

**Dependencies**: Phase 1

#### Subphase 3.1: Session Repository Interface

**Dependencies**: Phase 1

##### Task 3.1.1: Repository Interface
- Create `packages/session`
- Define `ISessionRepository` interface
- Include methods: create, get, update, delete, list
- Define `Session` type with metadata
- **Acceptance**: Interface compiles, clear contract

##### Task 3.1.2: In-Memory Implementation
- Implement `MemorySessionRepository`
- Use Map for storage with TTL cleanup
- Add session expiration logic
- **Acceptance**: Unit tests pass, sessions expire correctly

#### Subphase 3.2: Session Integration

**Dependencies**: 3.1, 2.2

##### Task 3.2.1: Session Lifecycle in Engine
- Integrate session repository with engine
- Handle `session/new`, `session/load` requests
- Store conversation history per session
- **Acceptance**: Sessions persist across multiple prompts

---

### Phase 4: Transport Layer

**Goal**: stdio transport with JSON-RPC protocol.

**Dependencies**: Phase 1, 2

#### Subphase 4.1: stdio Transport

**Dependencies**: Phase 1, 2

##### Task 4.1.1: JSON-RPC Parser
- Create `packages/transport`
- Implement Content-Length header parsing
- Handle JSON-RPC request/response format
- **Acceptance**: Parses ACP messages from stdin correctly

##### Task 4.1.2: Transport Integration
- Connect stdio to graph engine
- Route notifications to stdout
- Handle process signals (SIGTERM, SIGINT)
- **Acceptance**: Can send ACP request via stdin, receive response on stdout

##### Task 4.1.3: Streaming Support
- Stream session updates as JSON-RPC notifications
- Implement backpressure handling
- **Acceptance**: Streams large responses without memory issues

---

### Phase 5: Node Implementations

**Goal**: Core nodes for MVP (receiver, router, adapters, responder).

**Dependencies**: Phase 2

#### Subphase 5.1: Input Nodes

**Dependencies**: Phase 2

##### Task 5.1.1: ACP Receiver Node
- Implement `ACPReceiverNode`
- Accept ACP requests from transport
- Inject into pipeline with context
- **Acceptance**: Receives requests, creates pipeline messages

#### Subphase 5.2: Routing Nodes

**Dependencies**: 5.1

##### Task 5.2.1: Backend Selector Node
- Implement `BackendSelectorNode`
- Route based on `_meta.proxy.backend`
- Route based on required capabilities (thinking, reasoning)
- Default backend fallback
- **Acceptance**: Routes to correct backend output port

##### Task 5.2.2: Meta Injector Node
- Implement `MetaInjectorNode`
- Add proxy metadata (version, requestId, timestamps)
- Merge default backend settings from config
- **Acceptance**: Requests have proxy metadata injected

#### Subphase 5.3: Adapter Nodes

**Dependencies**: 5.2

##### Task 5.3.1: ACP Passthrough Adapter
- Implement `ACPPassthroughNode`
- Simple 1:1 forwarding for testing
- **Acceptance**: Can proxy to another ACP agent

##### Task 5.3.2: Anthropic Adapter - Request Translation
- Implement `AnthropicAdapterNode`
- Translate ACP → Anthropic Messages format
- Handle thinking, caching metadata
- Convert content blocks (text, image, resource)
- **Acceptance**: Generates valid Anthropic API request

##### Task 5.3.3: Anthropic Adapter - Response Translation
- Stream Anthropic events as RxJS observable
- Translate thinking_delta → thought_chunk
- Translate text_delta → content_chunk
- Handle tool_use blocks
- **Acceptance**: Streams responses back as ACP updates

##### Task 5.3.4: Anthropic Adapter - Error Handling
- Handle Anthropic API errors (rate limits, auth, validation)
- Translate to ACP error format with metadata
- Preserve retry-after headers
- **Acceptance**: Errors returned with correct codes and retry info

#### Subphase 5.4: Output Nodes

**Dependencies**: 5.3

##### Task 5.4.1: ACP Responder Node
- Implement `ACPResponderNode`
- Collect streaming updates
- Build final response with stopReason
- Add timing and usage metadata
- **Acceptance**: Returns complete ACP response

---

### Phase 6: CLI Application

**Goal**: Working CLI with start and init commands.

**Dependencies**: Phase 2, 4, 5

#### Subphase 6.1: CLI Framework

**Dependencies**: Phase 1

##### Task 6.1.1: Command Structure
- Set up commander in `apps/cli`
- Define git-style subcommands
- Add global options (--config, --verbose)
- **Acceptance**: `acphast --help` shows all commands

##### Task 6.1.2: Start Command
- Implement `acphast start` command
- Load config and graph
- Initialize engine with default graph
- Start stdio transport
- **Acceptance**: `acphast start` runs, accepts ACP on stdin

##### Task 6.1.3: Validate Command
- Implement `acphast validate` command
- Check config file validity
- Check graph file validity
- Validate API keys are set
- **Acceptance**: Catches config/graph errors before runtime

#### Subphase 6.2: Logging Integration

**Dependencies**: 6.1

##### Task 6.2.1: Structured Logging
- Set up pino logger
- Configure log levels from config
- Add request correlation IDs
- **Acceptance**: Logs are structured JSON, traceable

##### Task 6.2.2: Sentry Integration
- Add Sentry SDK
- Configure from environment (SENTRY_DSN)
- Capture unhandled errors
- Add context (requestId, sessionId) to errors
- **Acceptance**: Errors appear in Sentry dashboard

---

### Phase 7: Visual Editor (MVP)

**Goal**: React-based visual graph editor with hot-reload.

**Dependencies**: Phase 2, 6

#### Subphase 7.1: Editor UI

**Dependencies**: Phase 2

##### Task 7.1.1: React + Rete.js Setup
- Create `apps/editor` with Vite
- Set up Rete.js with React renderer
- Configure Rete plugins (area, connection, history)
- **Acceptance**: Blank Rete canvas renders

##### Task 7.1.2: Node Palette
- Create draggable node palette component
- List available node types from registry
- Implement drag-to-canvas behavior
- **Acceptance**: Can drag nodes onto canvas

##### Task 7.1.3: Graph Editing
- Implement node selection/deletion
- Implement connection creation/deletion
- Add undo/redo support
- **Acceptance**: Can build and modify graphs visually

##### Task 7.1.4: Properties Panel
- Display selected node properties
- Edit node configuration (model, API settings)
- Validate configuration in real-time
- **Acceptance**: Can configure node settings via UI

#### Subphase 7.2: Editor Backend Integration

**Dependencies**: 7.1, 6.1

##### Task 7.2.1: Embedded Web Server
- Add Hono server to CLI
- Serve built editor React app
- Expose on port 6809
- **Acceptance**: `acphast editor` opens browser to editor UI

##### Task 7.2.2: Engine API
- Add WebSocket endpoint for editor ↔ engine communication
- Implement graph load/save endpoints
- Implement graph validation endpoint
- **Acceptance**: Editor can load/save graphs to disk

##### Task 7.2.3: Hot-Reload UI
- Show graph status in editor (active/inactive)
- Display validation errors in UI
- Add "Apply Changes" flow with confirmation
- **Acceptance**: Graph changes apply from editor, UI shows status

#### Subphase 7.3: Default Graphs

**Dependencies**: 7.2

##### Task 7.3.1: Default Graph Implementation
- Create `graphs/default.json`
- Wire: Receiver → MetaInjector → BackendSelector → Anthropic/Passthrough → Responder
- Document graph structure
- **Acceptance**: Default graph loads and executes correctly

##### Task 7.3.2: Graph Templates
- Create additional example graphs
- Add graph template selector to editor
- **Acceptance**: Users can start from templates

---

### Phase 8: Testing & Documentation

**Goal**: Comprehensive tests and user documentation.

**Dependencies**: All previous phases

#### Subphase 8.1: Unit Tests

**Dependencies**: All implementation phases

##### Task 8.1.1: Core Package Tests
- Test metadata schemas and validation
- Test config loading and merging
- Test error types and codes
- **Acceptance**: >90% coverage on core package

##### Task 8.1.2: Node Tests
- Test each node in isolation with mocked inputs
- Test translation logic (ACP ↔ Anthropic)
- Test error handling in nodes
- **Acceptance**: All nodes have unit tests

##### Task 8.1.3: Engine Tests
- Test graph execution with mock nodes
- Test hot-reload behavior
- Test error propagation
- **Acceptance**: Engine behavior verified

#### Subphase 8.2: Integration Tests

**Dependencies**: 8.1

##### Task 8.2.1: End-to-End Flow Tests
- Test full ACP → Anthropic → ACP flow with real API
- Test passthrough adapter
- Test session persistence
- Use test API keys, small requests
- **Acceptance**: Real requests work end-to-end

##### Task 8.2.2: Transport Tests
- Test stdio message parsing
- Test streaming backpressure
- Test process signal handling
- **Acceptance**: Transport layer robust

##### Task 8.2.3: Error Scenario Tests
- Test rate limit handling
- Test authentication errors
- Test invalid graph handling
- **Acceptance**: Error paths tested

#### Subphase 8.3: Documentation

**Dependencies**: All phases

##### Task 8.3.1: User Guide
- Write README.md with quickstart
- Document installation (npm install -g acphast)
- Document acphast.toml options
- Provide example configurations
- **Acceptance**: New user can install and run

##### Task 8.3.2: Developer Guide
- Document node development
- Explain graph execution model
- Provide custom node examples
- **Acceptance**: Developer can create custom node

##### Task 8.3.3: API Reference
- Generate TypeDoc for packages
- Document metadata schemas
- Document error codes
- **Acceptance**: API docs published

---

## Testing Strategy

### Unit Testing
- **Framework**: Vitest
- **Coverage Target**: >80% for core packages
- **Mocking**: Mock LLM APIs with fixtures
- **Focus**: Individual nodes, utilities, schemas

### Integration Testing
- **Scope**: Full request flows through graph
- **Real APIs**: Small test requests with API keys
- **Fixtures**: Recorded request/response pairs
- **Focus**: Translation accuracy, error handling

### Manual Testing
- **Tools**: Custom ACP test client, curl
- **Scenarios**: Complex graphs, edge cases
- **Visual**: Editor drag-and-drop, hot-reload

### Performance Testing
- **Metrics**: Latency overhead, memory usage
- **Load**: Concurrent sessions, large responses
- **Target**: <100ms added latency, <500MB memory

## Deployment

### Installation
```bash
npm install -g acphast
# or
pnpm add -g acphast
```

### Configuration
1. Run `acphast init` to generate `acphast.toml`
2. Set API keys via environment:
   ```bash
   export ANTHROPIC_API_KEY=sk-...
   ```
3. Customize graph in `graphs/default.json` (optional)

### Running
```bash
# Start proxy on stdio
acphast start

# Start proxy + open editor
acphast editor

# Validate configuration
acphast validate
```

### Distribution
- Published to npm as `acphast`
- Single binary via pkg (future)
- Docker image (future)

## Security Considerations

### Credential Management
- MUST NOT store API keys in TOML config
- MUST read keys from environment variables only
- MUST sanitize logs to prevent key leakage
- SHOULD warn if keys found in config file

### Metadata Validation
- MUST validate `_meta` per configured policy
- MUST log unknown metadata keys
- SHOULD strip dangerous metadata in strict mode

### Process Isolation
- MUST handle SIGTERM/SIGINT gracefully
- MUST not leave zombie processes
- SHOULD use process sandboxing (future)

## Monitoring & Observability

### Logging
- Structured JSON logs via pino
- Log levels: debug, info, warn, error
- Correlation via requestId and sessionId
- Log sampling for high-volume (future)

### Error Tracking
- All unhandled errors to Sentry
- Context: graph state, node execution stack
- Rate limiting to prevent spam

### Metrics (Future)
- Request latency histograms
- Backend success/error rates
- Session duration
- Token usage aggregation

## Versioning

### Protocol Versions
- `_meta.proxy.version` indicates proxy protocol version
- Follows semver
- Independent of ACP version

### Compatibility
- MUST support ACP protocol version `2025-01`
- SHOULD be forward-compatible with unknown `_meta` keys
- MUST version graph JSON schema

## Interview Q&A Summary

**Q1: Implementation Language?**  
A: TypeScript with Rete.js

**Q2: Deployment Model?**  
A: Standalone CLI tool

**Q3: Transport Priority?**  
A: stdio (JSON-RPC)

**Q4: Backend Adapter Priority?**  
A: ACP passthrough + Anthropic Messages API

**Q5: Graph Execution Model?**  
A: Visual editor from the start

**Q6: Configuration Management?**  
A: TOML config file

**Q7: Testing Strategy?**  
A: Unit tests + integration tests

**Q8: Error Handling Strategy?**  
A: Pass through original error (future nodes for retry/fallback)

**Q9: Visual Editor Deployment?**  
A: Embedded web server in CLI on port 6809

**Q10: Streaming Implementation?**  
A: RxJS observables

**Q11: Package Manager?**  
A: pnpm workspace

**Q12: Session Management?**  
A: In-memory with abstract repository interface

**Q13: Graph Persistence?**  
A: File-based in project directory

**Q14: Front-End Receivers Priority?**  
A: ACP first, then Anthropic Messages API receiver

**Q15: Metadata Handling?**  
A: Configurable policy (strict/permissive/strip)

**Q16: Development Tooling?**  
A: tsx + tsc

**Q17: Logging?**  
A: Sentry.io

**Q18: CLI Structure?**  
A: Git-style subcommands

**Q19: Graph Hot-Reload?**  
A: Hot-reload with safety checks

**Q20: Type Safety?**  
A: Zod schemas with runtime validation

**Q21: Initial Scope?**  
A: Core proxy + visual editor (MVP)

---

## Next Steps

To begin implementation:

1. **Set up monorepo**: `pnpm init` and create workspace structure
2. **Start with Phase 1**: Foundation (types, config, schemas)
3. **Implement Phase 2**: Core engine with Rete.js + RxJS
4. **Build Phase 5**: Node implementations (adapters)
5. **Integrate Phase 6**: CLI application
6. **Add Phase 7**: Visual editor
7. **Complete Phase 8**: Testing and documentation

**Estimated Timeline**: 4-6 weeks for MVP with 1 developer, or 2-3 weeks with 2-3 developers working in parallel.

**Parallelization Opportunities**:
- Phase 1 (foundation) must complete first
- Phase 2 (engine) and Phase 3 (session) can be parallel after Phase 1
- Phase 4 (transport) can start after Phase 1
- Phase 5 (nodes) can start after Phase 2
- Phase 6 (CLI) can start after Phase 4 and 5
- Phase 7 (editor) can start after Phase 2
- Phase 8 (testing) can progress alongside implementation

**Critical Path**: Phase 1 → Phase 2 → Phase 5 → Phase 6 → Phase 7 (MVP complete)
