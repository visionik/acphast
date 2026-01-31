# Acphos

**Universal LLM Protocol Translator**

Acphos is a bidirectional proxy that translates between any LLM protocol—ACP, Anthropic Messages, OpenAI Responses, Chat Completions, and proprietary WebSocket APIs—without losing provider-specific capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                           ACPHOS                                 │
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │    acphos-front     │         │    acphos-back      │        │
│  │                     │   ACP   │                     │        │
│  │  Any Protocol  ───► │ ──────► │ ───►  Any Protocol  │        │
│  │                     │ (core)  │                     │        │
│  └─────────────────────┘         └─────────────────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Features

- **Bidirectional translation** between any supported protocols
- **Zero capability loss** via `_meta` extensions
- **Streaming support** for real-time token output
- **Filter graph architecture** using Rete.js (TypeScript) or channels (Go)
- **Visual graph editing** (optional) for routing configuration
- **Multi-backend routing** based on capabilities or explicit selection

## Example Chains

```
Messages API → Acphos → Claude Code
Responses API → Acphos → Anthropic Messages  
OpenAI SDK → Acphos → Local Ollama
Claude Code → Acphos → GPT-4
```

## Documentation

| Document | Description |
|----------|-------------|
| [ACPHOS-PROXY-SPEC.md](docs/ACPHOS-PROXY-SPEC.md) | Protocol specification, `_meta` schemas |
| [ACPHOS-ARCHITECTURE.md](docs/ACPHOS-ARCHITECTURE.md) | Rete.js TypeScript implementation |
| [ACPHOS-BIDIRECTIONAL.md](docs/ACPHOS-BIDIRECTIONAL.md) | Front/back split architecture |
| [ACPHOS-GO.md](docs/ACPHOS-GO.md) | Go implementation with channels |
| [ACPHOS-README.md](docs/ACPHOS-README.md) | Quick start summary |
| [VISIONIK-AI-ROADMAP.md](docs/VISIONIK-AI-ROADMAP.md) | Full ecosystem roadmap |

## Status

**Draft** — Design phase. Not yet implemented.

## License

TBD
