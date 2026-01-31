# Visionik AI Ecosystem Roadmap

**A Complete AI Coding System**

## Overview

Five projects that together form a complete AI-assisted software development ecosystem:

```mermaid
flowchart TB
    subgraph Orchestration["🎯 ORCHESTRATION"]
        JTK[JTK Captain]
        JTK --> E1[Ensign Alpha]
        JTK --> E2[Ensign Beta]
        JTK --> E3[Ensign Gamma]
    end
    
    subgraph Protocol["🔌 PROTOCOL"]
        E1 & E2 & E3 --> Acphast
        Acphast --> Claude[Claude API]
        Acphast --> GPT[GPT-4 API]
        Acphast --> Ollama[Ollama Local]
    end
    
    subgraph Knowledge["📚 KNOWLEDGE"]
        Deft[Deft\nStandards & Prefs]
        vContext[vContext\nMemory & Plans]
        dashdash[dashdash\nTool Discovery]
    end
    
    Knowledge -.-> Orchestration
    Knowledge -.-> Protocol
    
    style JTK fill:#4a9eff
    style Acphast fill:#9b59b6
    style Deft fill:#2ecc71
    style vContext fill:#e74c3c
    style dashdash fill:#f39c12
```

---

## The Five Projects

### 1. Deft — Standards & Preferences

**What:** Layered framework for AI-assisted development with consistent standards.

**Role in System:** The "brain" that tells agents HOW to code.

```mermaid
flowchart TB
    subgraph Deft["Deft Hierarchy"]
        direction TB
        User["user.md\n(Highest Priority)"]
        Project["project.md"]
        Lang["python.md | go.md | typescript.md"]
        Main["main.md\n(General Guidelines)"]
        
        User --> Project --> Lang --> Main
    end
    
    style User fill:#ff6b6b
    style Project fill:#feca57
    style Lang fill:#48dbfb
    style Main fill:#1dd1a1
```

**Key Features:**
- Hierarchical rule precedence (user > project > language > general)
- RFC 2119 notation (!, ~, ≉, ⊗) for requirements
- Lazy loading — only load relevant files
- Self-improving — meta files capture learnings

**Integration Points:**
- JTK ensigns load Deft standards before executing tasks
- Acphast can inject Deft system prompts into LLM requests
- vContext plans can reference Deft workflows

---

### 2. JTK — Parallel Orchestration

**What:** Captain-ensign architecture for parallel coding agents.

**Role in System:** The "conductor" that coordinates multiple agents.

```mermaid
flowchart TB
    subgraph Captain["JTK Captain"]
        Parser["Plan Parser\n(vContext)"]
        DAG["DAG Builder"]
        Queue["Task Queue"]
        Dispatch["Work Dispatcher"]
        
        Parser --> DAG --> Queue --> Dispatch
    end
    
    Dispatch --> E1["Ensign\n(Warp)"]
    Dispatch --> E2["Ensign\n(Cursor)"]
    Dispatch --> E3["Ensign\n(Aider)"]
    
    style Captain fill:#4a9eff,color:#fff
    style E1 fill:#2ecc71
    style E2 fill:#2ecc71
    style E3 fill:#2ecc71
```

**Key Features:**
- vContext-native plan execution
- Git worktree isolation per worker
- Dependency-aware parallelism
- Checkpoint/resume for fault tolerance
- Agent-agnostic (Warp, Cursor, Aider, etc.)

**Integration Points:**
- Reads vContext plans for task definitions
- Applies Deft standards to each ensign
- Routes through Acphast for LLM backend flexibility
- Uses dashdash for tool discovery

---

### 3. vContext — Agent Memory

**What:** Open spec for todo lists, plans, and playbooks.

**Role in System:** The "memory" that structures agent work.

```mermaid
flowchart LR
    subgraph ShortTerm["Short-term"]
        Todo["📋 TodoList\n□ Fix bug #123\n☑ Update deps\n□ Write tests"]
    end
    
    subgraph MediumTerm["Medium-term"]
        Plan["📁 Plan\nPhase 1: Setup\n  └─ Item 1.1\n  └─ Item 1.2\nPhase 2: Core\n  └─ Item 2.1"]
    end
    
    subgraph LongTerm["Long-term"]
        Playbook["📖 Playbook\nStrategy: Testing\nPattern: Error\nLearning: Cache"]
    end
    
    Todo --> Plan --> Playbook
    
    style Todo fill:#48dbfb
    style Plan fill:#feca57
    style Playbook fill:#ff6b6b
```

**Key Features:**
- TRON encoding (token-efficient for LLMs)
- JSON compatibility for tooling
- Hierarchical items with dependencies
- Status tracking across sessions
- Cross-document linking

**Integration Points:**
- JTK parses vContext plans for orchestration
- Deft workflows can output vContext todos
- Playbooks accumulate learnings from JTK missions
- Acphast can include vContext in LLM context

---

### 4. dashdash — Tool Discovery

**What:** Spec for AI agents to discover and use tools.

**Role in System:** The "interface" that teaches agents about tools.

```mermaid
flowchart TB
    subgraph Methods["Four Access Methods"]
        CLI["🖥️ CLI\n--ai-help flag\nYAML + Markdown"]
        Web["🌐 Web\n/llms.txt\nYAML + Markdown"]
        API["🔗 API\nCross-ref from\nCLI/Web docs"]
        MCP["🔌 MCP\nai_help method\ndashdash extension"]
    end
    
    CLI <--> Web
    CLI <--> API
    CLI <--> MCP
    Web <--> API
    Web <--> MCP
    API <--> MCP
    
    style CLI fill:#9b59b6,color:#fff
    style Web fill:#3498db,color:#fff
    style API fill:#e74c3c,color:#fff
    style MCP fill:#2ecc71,color:#fff
```

**Key Features:**
- Unified discovery across CLI, Web, API, MCP
- "When to Use" sections for skill triggering
- Cross-references between access methods
- Go/Cobra integration for auto-generation

**Integration Points:**
- Deft skills can reference dashdash for tool usage
- JTK ensigns discover tools via dashdash
- Acphast can route to MCP servers discovered via dashdash
- vContext playbooks can store tool learnings

---

### 5. Acphast — Protocol Translation

**What:** Universal proxy between any LLM protocols.

**Role in System:** The "translator" that decouples agents from backends.

```mermaid
flowchart LR
    subgraph Front["acphast-front"]
        M[Messages API]
        R[Responses API]
        C[Chat Completions]
        A[ACP]
    end
    
    Core["ACP\nCore"]
    
    subgraph Back["acphast-back"]
        Anthropic
        OpenAI
        Ollama
        OtherACP[Other ACP]
    end
    
    M & R & C & A --> Core
    Core --> Anthropic & OpenAI & Ollama & OtherACP
    
    style Core fill:#9b59b6,color:#fff
```

**Key Features:**
- Bidirectional protocol translation
- Zero capability loss via `_meta` extensions
- Filter graph architecture (Rete.js / Go channels)
- Visual graph editing for routing
- Multi-backend routing and load balancing

**Integration Points:**
- JTK routes all LLM calls through Acphast
- Can inject Deft system prompts
- Supports MCP tools discovered via dashdash
- Can include vContext in requests

---

## How They Fit Together

### Data Flow

```mermaid
flowchart TB
    Dev["👨‍💻 Developer"] --> |"1. Creates"| Plan["vContext Plan"]
    Plan --> |"2. Parses"| Captain["JTK Captain"]
    Captain --> |"3. Assigns tasks"| Ensign["Ensign Workers"]
    
    subgraph EnsignWork["Each Ensign"]
        LoadDeft["Load Deft Standards"]
        DiscoverTools["Discover Tools\n(dashdash)"]
        CallLLM["Call LLM\n(via Acphast)"]
        Execute["Execute Task"]
        Report["Report Completion"]
        
        LoadDeft --> DiscoverTools --> CallLLM --> Execute --> Report
    end
    
    Ensign --> EnsignWork
    
    Report --> |"4. Updates"| Captain
    Captain --> |"5. Updates"| TodoList["vContext TodoList"]
    Captain --> |"6. Captures"| Playbook["vContext Playbook"]
    
    style Dev fill:#4a9eff,color:#fff
    style Captain fill:#2ecc71
    style Ensign fill:#f39c12
```

### Integration Matrix

| Component | Uses Deft | Uses JTK | Uses vContext | Uses dashdash | Uses Acphast |
|-----------|-----------|----------|---------------|---------------|-------------|
| **Deft** | — | Standards for ensigns | Workflow → todos | Tool usage docs | System prompts |
| **JTK** | Ensign standards | — | Plan execution | Tool discovery | LLM routing |
| **vContext** | Workflow refs | Plan format | — | — | Context inclusion |
| **dashdash** | Skill definitions | Tool for ensigns | — | — | MCP routing |
| **Acphast** | Prompt injection | Backend for JTK | Context in requests | MCP discovery | — |

---

## Roadmap

### Phase 1: Foundation (Current)

| Project | Status | Next Steps |
|---------|--------|------------|
| **Deft** | ✅ v1.0 | Expand language support, add more workflows |
| **JTK** | 🚧 v0.2 | Stabilize mission orchestration, production testing |
| **vContext** | 📝 v0.4 | Finalize spec, build reference parsers |
| **dashdash** | 📝 v0.2 | Implement Go/Cobra integration, test with real tools |
| **Acphast** | 📝 Design | Implement core engine, build adapters |

### Phase 2: Integration

```mermaid
gantt
    title Integration Roadmap 2026
    dateFormat  YYYY-MM
    section Q1
    JTK + vContext           :2026-01, 3M
    JTK + Deft               :2026-01, 3M
    Acphast Core (TS)        :2026-02, 2M
    section Q2
    JTK + Acphast            :2026-04, 3M
    dashdash + Deft          :2026-04, 2M
    Acphast Adapters         :2026-05, 2M
    section Q3
    Integration Testing      :2026-07, 2M
    dashdash + JTK           :2026-07, 2M
    vContext Playbooks       :2026-08, 2M
    section Q4
    Production Deploy        :2026-10, 2M
    Acphast Go               :2026-10, 2M
    Visual Graph Editor      :2026-11, 2M
```

### Phase 3: Ecosystem

```mermaid
timeline
    title 2027+ Ecosystem Growth
    section Public Launch
        Deft Standard Library : Community contributions
        vContext Tool Ecosystem : Third-party integrations
    section Adoption
        dashdash by Tool Authors : Widespread --ai-help
        Acphast as Standard : Industry protocol
    section Scale
        JTK Cloud Service : Hosted orchestration
```

---

## The Vision

**Today:** Developers use individual AI tools (Cursor, Copilot, Claude) in isolation, losing context between sessions, re-explaining preferences, manually coordinating parallel work.

**With this ecosystem:**

```mermaid
flowchart LR
    subgraph Today["❌ Today"]
        direction TB
        T1["Lost context"]
        T2["Re-explain preferences"]
        T3["Manual coordination"]
        T4["Vendor lock-in"]
    end
    
    subgraph Future["✅ With Ecosystem"]
        direction TB
        F1["Deft: Consistent standards"]
        F2["vContext: Persistent memory"]
        F3["JTK: Auto parallelization"]
        F4["Acphast: Swap backends"]
        F5["dashdash: Discover tools"]
    end
    
    Today --> |"Transform"| Future
    
    style Today fill:#e74c3c,color:#fff
    style Future fill:#2ecc71,color:#fff
```

**The result:** An AI-augmented development environment where:
- Standards are applied consistently
- Memory persists and evolves
- Tools are discoverable and interchangeable
- Backends are swappable
- Work is parallelized automatically

---

## Repository Links

| Project | Repo | Description |
|---------|------|-------------|
| Deft | [visionik/deft](https://github.com/visionik/deft) | Standards & guidelines |
| JTK | [visionik/jtk](https://github.com/visionik/jtk) | Parallel orchestration |
| vContext | [visionik/vcontext](https://github.com/visionik/vcontext) | Memory specification |
| dashdash | [visionik/dashdash](https://github.com/visionik/dashdash) | Tool discovery |
| Acphast | [visionik/acphast](https://github.com/visionik/acphast) | Protocol translation |

---

## Quick Start (Future)

```bash
# Install the ecosystem
brew install visionik/tap/ai-coding-system

# Initialize a project with Deft standards
deft init

# Create a vContext plan
vcontext plan create "Build feature X"

# Start JTK captain with the plan
jtk captain start ./plans/feature-x.vcontext

# Connect ensigns (in separate terminals)
jtk ensign connect --agent warp
jtk ensign connect --agent cursor

# Watch parallel execution
jtk mission watch
```

---

## Summary

```mermaid
flowchart TB
    subgraph Stack["The Complete Stack"]
        direction TB
        L1["🎯 Orchestration: JTK"]
        L2["🔌 Protocol: Acphast"]
        L3["📏 Standards: Deft"]
        L4["🧠 Memory: vContext"]
        L5["🔍 Discovery: dashdash"]
        
        L1 --> L2 --> L3 --> L4 --> L5
    end
    
    style L1 fill:#4a9eff,color:#fff
    style L2 fill:#9b59b6,color:#fff
    style L3 fill:#2ecc71,color:#fff
    style L4 fill:#e74c3c,color:#fff
    style L5 fill:#f39c12,color:#fff
```

Together: **A complete, open, interoperable AI coding system.**
