# Rete Node Architecture Decision

## Question: Can we implement core components as Rete nodes?

**Answer: Absolutely YES!** This is actually a superior architectural approach.

## Benefits of Node-Based Core Components

### 1. **Visual Debugging**
Every component becomes visible and debuggable in the graph editor:
- See exact data flow through transformations
- Inspect inputs/outputs at each node
- Add breakpoints visually

### 2. **Runtime Flexibility**
Users can rewire the system without code:
- Swap backends by connecting different adapter nodes
- Add custom transformation nodes
- Insert logging/monitoring nodes anywhere
- Change routing logic visually

### 3. **Composability**
Mix and match built-in and custom nodes:
- Official Acphast nodes (receiver, adapters, routers)
- User-defined nodes (custom auth, rate limiting)
- Third-party plugin nodes

### 4. **Hot-Reload Native**
Graph changes automatically update the flow:
- No code restart needed
- Visual confirmation of changes
- Test different configurations instantly

## Core Components as Nodes

### Input/Output Nodes
```
ACPReceiverNode        - Entry point for ACP requests
ACPResponderNode       - Exit point, builds final response
```

### Routing Nodes  
```
BackendSelectorNode    - Route based on _meta or capabilities
CapabilityGateNode     - Filter by required features
LoadBalancerNode       - Distribute across backends
FallbackChainNode      - Try backend A, then B, then C
```

### Transform Nodes
```
MetaInjectorNode       - Add proxy metadata
MetaMergerNode         - Combine metadata from multiple sources
ContentTransformNode   - Modify content blocks
ValidationNode         - Validate schemas
```

### Adapter Nodes (Backend)
```
AnthropicAdapterNode   - Claude API
OpenAIAdapterNode      - GPT/O-series API
OllamaAdapterNode      - Local models
ACPPassthroughNode     - Forward to another ACP agent
```

### Utility Nodes
```
LoggerNode            - Log pipeline messages
UsageAggregatorNode   - Track token usage
CostCalculatorNode    - Estimate costs
CacheNode             - Response caching
RetryNode             - Retry with exponential backoff
TimeoutNode           - Add timeouts
```

### Advanced Nodes (Future)
```
A/BTestNode           - Split traffic for testing
ConsensusNode         - Query multiple backends, merge results
SentimentRouterNode   - Route based on prompt sentiment
RAGNode               - Add retrieval augmentation
```

## Implementation Strategy

### Base Node Interface
```typescript
// All Acphast nodes extend this
abstract class AcphastNode extends ClassicPreset.Node {
  // RxJS observable-based processing
  abstract process(
    inputs: Record<string, Observable<PipelineMessage>>,
    ctx: PipelineContext
  ): Observable<PipelineMessage>;
  
  // Configuration from graph JSON
  config: Record<string, unknown>;
  
  // Metadata for editor
  static meta: {
    name: string;
    category: 'input' | 'routing' | 'transform' | 'adapter' | 'output' | 'utility';
    description: string;
    inputs: PortDefinition[];
    outputs: PortDefinition[];
  };
}
```

### Example: Backend Selector as Node

```typescript
class BackendSelectorNode extends AcphastNode {
  static meta = {
    name: 'Backend Selector',
    category: 'routing',
    description: 'Routes to backend based on metadata or capabilities',
    inputs: [
      { name: 'in', type: 'pipeline', label: 'Input' }
    ],
    outputs: [
      { name: 'anthropic', type: 'pipeline', label: 'Anthropic' },
      { name: 'openai', type: 'pipeline', label: 'OpenAI' },
      { name: 'ollama', type: 'pipeline', label: 'Ollama' },
      { name: 'acp', type: 'pipeline', label: 'ACP' }
    ]
  };

  constructor(public config: {
    defaultBackend: string;
    backends: Record<string, BackendCapabilities>;
  }) {
    super('Backend Selector');
    this.addInput('in', new Input(socket, 'Input'));
    this.addOutput('anthropic', new Output(socket, 'Anthropic'));
    this.addOutput('openai', new Output(socket, 'OpenAI'));
    this.addOutput('ollama', new Output(socket, 'Ollama'));
    this.addOutput('acp', new Output(socket, 'ACP'));
  }

  process(inputs: Record<string, Observable<PipelineMessage>>) {
    return inputs.in.pipe(
      map((msg) => {
        const backend = this.selectBackend(msg);
        msg.backend = backend;
        return { [backend]: msg };
      })
    );
  }

  private selectBackend(msg: PipelineMessage): string {
    const requestedBackend = msg.request.params?._meta?.proxy?.backend;
    if (requestedBackend && this.config.backends[requestedBackend]) {
      return requestedBackend;
    }

    // Check capabilities
    const meta = msg.request.params?._meta as any;
    if (meta?.anthropic?.thinking) {
      return 'anthropic';
    }
    if (meta?.openai?.reasoning) {
      return 'openai';
    }

    return this.config.defaultBackend;
  }
}
```

## Visual Editor Benefits

### Node Palette
```
┌─────────────────────┐
│   Node Palette      │
├─────────────────────┤
│ Input/Output        │
│  ▶ ACP Receiver     │
│  ▶ ACP Responder    │
│                     │
│ Routing             │
│  ▶ Backend Selector │
│  ▶ Capability Gate  │
│  ▶ Load Balancer    │
│                     │
│ Adapters            │
│  ▶ Anthropic        │
│  ▶ OpenAI           │
│  ▶ Ollama           │
│  ▶ ACP Passthrough  │
│                     │
│ Transforms          │
│  ▶ Meta Injector    │
│  ▶ Validator        │
│                     │
│ Utilities           │
│  ▶ Logger           │
│  ▶ Usage Tracker    │
│  ▶ Cache            │
│  ▶ Retry            │
└─────────────────────┘
```

### Example Graphs Users Can Build

#### Simple Anthropic Proxy
```
[ACP Receiver] → [Meta Injector] → [Anthropic Adapter] → [ACP Responder]
```

#### Multi-Backend with Fallback
```
                    ┌→ [Anthropic] →┐
[Receiver] → [Router]→ [OpenAI]   →[Merger] → [Responder]
                    └→ [Ollama]    →┘
```

#### With Retry and Logging
```
[Receiver] → [Logger] → [Retry] → [Backend] → [Usage Tracker] → [Responder]
                           ↓ (on error)
                      [Logger (errors)]
```

#### A/B Testing
```
                    ┌→ [Claude Sonnet] →┐
[Receiver] → [Split 50/50]             [Compare] → [Responder]
                    └→ [Claude Opus]  →┘
```

## Plugin Architecture

### Third-Party Nodes
Users can publish npm packages like:
```
npm install acphast-plugin-redis-cache
npm install acphast-plugin-prompt-optimizer
npm install acphast-plugin-custom-auth
```

Each plugin exports node classes:
```typescript
import { AcphastNode } from '@acphast/nodes/base';

export class RedisCacheNode extends AcphastNode {
  static meta = {
    name: 'Redis Cache',
    category: 'utility',
    // ...
  };
  // ...
}
```

The node registry auto-discovers plugins and adds them to the palette.

## Configuration via Graph JSON

Instead of hardcoded logic, entire behavior defined in JSON:

```json
{
  "nodes": [
    {
      "id": "receiver-1",
      "type": "ACPReceiver"
    },
    {
      "id": "selector-1",
      "type": "BackendSelector",
      "config": {
        "defaultBackend": "anthropic",
        "backends": {...}
      }
    },
    {
      "id": "anthropic-1",
      "type": "AnthropicAdapter",
      "config": {
        "model": "claude-sonnet-4-20250514",
        "maxTokens": 8192
      }
    }
  ],
  "connections": [
    { "from": "receiver-1:out", "to": "selector-1:in" },
    { "from": "selector-1:anthropic", "to": "anthropic-1:in" }
  ]
}
```

## Implementation Plan Update

With this approach, the implementation plan changes slightly:

### Phase 2: Core Engine (SAME)
- Rete.js + RxJS integration
- Graph execution
- Hot-reload

### Phase 5: Node Implementations (EXPANDED)
Instead of monolithic "adapters" and "routers", we build modular nodes:

**Phase 5.1: Base Node System**
- `AcphastNode` base class
- Node registry and discovery
- Configuration schema per node

**Phase 5.2: Input/Output Nodes**
- ACPReceiverNode
- ACPResponderNode

**Phase 5.3: Routing Nodes**
- BackendSelectorNode
- CapabilityGateNode

**Phase 5.4: Transform Nodes**
- MetaInjectorNode
- ValidationNode

**Phase 5.5: Adapter Nodes**
- AnthropicAdapterNode
- ACPPassthroughNode

**Phase 5.6: Utility Nodes**
- LoggerNode
- UsageAggregatorNode
- RetryNode (uses RxJS retry operators!)

## Advantages Over Traditional Architecture

### Traditional: Hardcoded Pipeline
```typescript
// Code changes required to modify behavior
class AcphastEngine {
  async process(request: ACPRequest) {
    const backend = this.selectBackend(request);  // Hardcoded logic
    const adapter = this.getAdapter(backend);     // Hardcoded mapping
    return adapter.process(request);              // Fixed flow
  }
}
```

### Node-Based: User-Configurable
```json
{
  "graph": "my-custom-flow.json"
}
```
No code changes needed. Just edit the graph visually or in JSON.

## Conclusion

**YES**, implementing core components as Rete nodes is the right architectural choice. It:

- Makes the system **visual and debuggable**
- Enables **runtime reconfiguration**
- Supports **plugins and extensibility**
- Provides **natural hot-reload**
- Aligns perfectly with **RxJS observables**
- Makes **complex routing logic** simple to understand

The visual editor becomes not just a "nice-to-have" but the **core interface** for configuring Acphast behavior.

## Next Steps

1. Complete Phase 1 (Foundation) ✅
2. Build Phase 2 (Engine) with node-first architecture
3. Create node base classes in Phase 2.1
4. Implement nodes incrementally in Phase 5
5. Each node is independent and can be developed in parallel
6. Users can immediately see and test nodes in the editor
