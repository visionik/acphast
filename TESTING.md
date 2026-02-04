# Testing Acphast

## Prerequisites

- Anthropic API key (get one at https://console.anthropic.com/)
- Node.js 20+
- pnpm

## Setup

1. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

2. Build the project:
```bash
pnpm -r build
```

## Test 1: Simple Passthrough (No API Key Required)

```bash
# Start server
pnpm --filter @acphast/cli start

# In another terminal, send a test request:
echo '{"jsonrpc":"2.0","method":"acp/messages/create","params":{"model":"test","messages":[{"role":"user","content":"hello"}]},"id":1}' | pnpm --filter @acphast/cli start
```

## Test 2: Anthropic Claude (API Key Required)

The Anthropic adapter is now registered! To use it:

1. **Modify the CLI** to load the Claude graph:

Edit `packages/cli/src/index.ts` in the `loadDefaultGraph()` method:

```typescript
private async loadDefaultGraph(): Promise<void> {
  // Load Claude graph instead of passthrough
  const fs = await import('fs/promises');
  const graphPath = './graphs/claude.json';
  const graphData = await fs.readFile(graphPath, 'utf-8');
  const graph = JSON.parse(graphData);
  
  await this.engine.loadGraph(graph);
  this.logger.info('Loaded Claude graph');
}
```

2. **Rebuild and run**:

```bash
pnpm --filter @acphast/cli build
ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start
```

3. **Send a request**:

```json
{
  "jsonrpc": "2.0",
  "method": "acp/messages/create",
  "params": {
    "model": "claude-sonnet-4-20250514",
    "messages": [
      {
        "role": "user",
        "content": "Say 'Hello from Acphast!' in a creative way."
      }
    ],
    "max_tokens": 100
  },
  "id": 1
}
```

You should see:
- Streaming updates as Claude generates the response
- Final complete response with usage stats
- All logs going to stderr

## Test 3: Using test-client.js

The automated test client works with the passthrough node:

```bash
node test-client.js
```

## Current Graph Configurations

### graphs/claude.json
- Single Anthropic Adapter node
- Uses Claude Sonnet 4
- Default max tokens: 4096
- Temperature: 1.0

### Future: graphs/multi-backend.json
- Router node that selects between Anthropic/OpenAI
- Conditional routing based on model name
- Fallback logic

## Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @acphast/cli start
```

You'll see:
- Request parsing
- Node execution
- Anthropic API calls
- Streaming events
- Response assembly

## What's Working

✅ **Infrastructure**
- JSON-RPC transport (stdio)
- Graph engine execution
- Node registry
- Session management

✅ **Nodes**
- ACP Passthrough (testing)
- Anthropic Adapter (Claude models)

✅ **Streaming**
- Real-time content delivery
- Usage tracking
- Error handling

## What's Next

⏳ **Coming Soon**
- OpenAI adapter (GPT models)
- Router node (conditional logic)
- HTTP transport (web access)
- Full Rete.js visual editor

## Common Issues

### "API key not found"
Set `ANTHROPIC_API_KEY` environment variable

### "Node type not found"
Make sure the node is registered in CLI's constructor

### "Graph validation failed"
Check that node types match registered names exactly

## Architecture Notes

Every request flows through:
1. Transport → Receives JSON-RPC
2. CLI → Parses and creates PipelineMessage
3. Engine → Executes through graph nodes
4. Node → Processes with RxJS observables
5. Transport → Sends response back

All components use:
- TypeScript with strict mode
- RxJS for streaming
- Rete.js for graph management
- JSON-RPC 2.0 protocol
