# Acphast

**Agent Client Protocol Heterogeneous Adapter Streaming Transceiver**

*Universal LLM Protocol Translator*

Acphast is a bidirectional proxy that translates between any LLM protocol—ACP, Anthropic Messages, OpenAI Responses, Chat Completions, and proprietary WebSocket APIs—without losing provider-specific capabilities.

```mermaid
flowchart LR
    subgraph Acphast
        subgraph Front["acphast-front"]
            direction TB
            IN1[Messages API]
            IN2[Responses API]
            IN3[Chat Completions]
            IN4[ACP]
            IN5[WebSocket]
        end
        
        Core["ACP\n(core)"]
        
        subgraph Back["acphast-back"]
            direction TB
            OUT1[Anthropic]
            OUT2[OpenAI]
            OUT3[Ollama]
            OUT4[Other ACP]
            OUT5[WebSocket]
        end
        
        Front --> Core --> Back
    end
    
    Client([Any Client]) --> Front
    Back --> LLM([Any LLM])
```

## Features

- **Bidirectional translation** between any supported protocols
- **Zero capability loss** via `_meta` extensions
- **Streaming support** for real-time token output
- **Filter graph architecture** using Rete.js (TypeScript) or channels (Go)
- **Visual graph editing** (optional) for routing configuration
- **Multi-backend routing** based on capabilities or explicit selection

## Example Chains

```mermaid
flowchart LR
    subgraph Examples
        direction TB
        
        M1[Messages API] --> A1[Acphast] --> C1[Claude Code]
        M2[Responses API] --> A2[Acphast] --> C2[Anthropic Messages]
        M3[OpenAI SDK] --> A3[Acphast] --> C3[Local Ollama]
        M4[Claude Code] --> A4[Acphast] --> C4[GPT-4]
    end
    
    style A1 fill:#4a9eff
    style A2 fill:#4a9eff
    style A3 fill:#4a9eff
    style A4 fill:#4a9eff
```

## Architecture

```mermaid
flowchart TB
    subgraph Input["Input Protocols"]
        I1[Anthropic Messages]
        I2[OpenAI Responses]
        I3[Chat Completions]
        I4[ACP stdio]
        I5[WebSocket]
    end
    
    subgraph Processing["Acphast Core"]
        direction TB
        Recv[Receiver Node]
        Norm[Normalizer]
        Route[Backend Router]
        
        Recv --> Norm --> Route
    end
    
    subgraph Adapters["Backend Adapters"]
        direction TB
        AA[Anthropic Adapter]
        OA[OpenAI Adapter]
        OL[Ollama Adapter]
        AP[ACP Passthrough]
    end
    
    subgraph Output["Output"]
        Resp[Response Denormalizer]
    end
    
    I1 & I2 & I3 & I4 & I5 --> Recv
    Route --> AA & OA & OL & AP
    AA & OA & OL & AP --> Resp
    Resp --> Client([Client])
```

## Documentation

| Document | Description |
|----------|-------------|
| [ACPHAST-PROXY-SPEC.md](docs/ACPHAST-PROXY-SPEC.md) | Protocol specification, `_meta` schemas |
| [ACPHAST-ARCHITECTURE.md](docs/ACPHAST-ARCHITECTURE.md) | Rete.js TypeScript implementation |
| [ACPHAST-BIDIRECTIONAL.md](docs/ACPHAST-BIDIRECTIONAL.md) | Front/back split architecture |
| [ACPHAST-GO.md](docs/ACPHAST-GO.md) | Go implementation with channels |
| [ACPHAST-README.md](docs/ACPHAST-README.md) | Quick start summary |
| [VISIONIK-AI-ROADMAP.md](docs/VISIONIK-AI-ROADMAP.md) | Full ecosystem roadmap |

## Status

**Draft** — Design phase. Not yet implemented.

## License

TBD
