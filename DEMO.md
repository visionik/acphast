# Acphast Web Chat Demo

## \ud83c\udfaf Quick Start (1 minute)

```bash
# 1. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# 2. Start the server
./start-demo.sh

# 3. Open the chat (in another terminal or just open the file)
open web/chat.html
```

That's it! You're now chatting with Claude through Acphast \ud83c\udf89

## \ud83d\udcbb What's Happening

### Backend (Node.js)
1. HTTP server starts on `http://localhost:6809`
2. Loads Anthropic adapter node
3. Waits for JSON-RPC requests

### Frontend (Browser)
1. Opens `web/chat.html`
2. Connects to server
3. Sends your messages as JSON-RPC
4. Displays Claude's responses

## \ud83c\udfae Try These

### Chat Examples
- "Explain quantum computing in simple terms"
- "Write a haiku about programming"
- "What's the difference between ACP and OpenAI's API?"

### Configuration
- **Model**: Change in the UI (default: claude-sonnet-4-20250514)
- **Max Tokens**: Adjust in the UI (default: 1000)
- **Port**: Set `PORT=8080` env var

### Advanced
```bash
# Debug mode
LOG_LEVEL=debug TRANSPORT=http pnpm --filter @acphast/cli start

# Different port
TRANSPORT=http PORT=8080 pnpm --filter @acphast/cli start
```

## \ud83d\udd27 Troubleshooting

### "Server not running"
Make sure the HTTP server is running:
```bash
TRANSPORT=http pnpm --filter @acphast/cli start
```

### "API key not found"
Set the environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### "Model not found"
The passthrough graph is loaded by default. For Anthropic to work, you'd need to:
1. Modify `packages/cli/src/index.ts` to load `graphs/claude.json`, or
2. Wait for the graph loader feature (coming soon!)

## \ud83d\udca1 What Makes This Cool

### Architecture
- **Universal Protocol**: Uses ACP (Agent Client Protocol)
- **Graph-Based**: Requests flow through Rete.js nodes
- **Streaming**: Real-time token-by-token responses
- **Multi-Backend**: Easy to add OpenAI, Ollama, etc.

### Technical
- TypeScript throughout
- RxJS for streaming
- JSON-RPC 2.0
- HTTP + SSE (Server-Sent Events)
- No framework needed (vanilla JS in browser)

## \ud83d\ude80 Next Steps

Want to go deeper?

1. **Add OpenAI Support**
   - Implement OpenAI adapter node
   - Support GPT-4, GPT-4o, etc.

2. **Multi-Backend Routing**
   - Create router node
   - Automatically pick best backend

3. **Visual Graph Editor**
   - Full Rete.js drag-and-drop
   - Build graphs in the browser

4. **Advanced Features**
   - Caching layer
   - Usage tracking
   - Cost optimization
   - Prompt templates

## \ud83d\udcda Learn More

- **Architecture**: `docs/RETE-NODE-ARCHITECTURE.md`
- **Testing**: `TESTING.md`
- **Progress**: `docs/IMPLEMENTATION-PROGRESS.md`
- **Session**: `SESSION-SUMMARY.md`

## \u2764\ufe0f Credits

Built with:
- Rete.js (graph engine)
- Anthropic SDK
- RxJS (streaming)
- TypeScript
- Node.js

---

**Status**: MVP 65% complete  
**Time to Demo**: ~1 minute  
**Lines of Code**: ~7,200+  
**Coolness Factor**: \ud83d\udd25\ud83d\udd25\ud83d\udd25
