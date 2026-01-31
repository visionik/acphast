# Visionik AI Ecosystem Roadmap

**A Complete AI Coding System**

## Overview

Five projects that together form a complete AI-assisted software development ecosystem:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                         THE COMPLETE AI CODING SYSTEM                            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                            ORCHESTRATION                                 │    │
│  │                                                                          │    │
│  │                          ┌───────────┐                                   │    │
│  │                          │    JTK    │                                   │    │
│  │                          │ (Captain) │                                   │    │
│  │                          └─────┬─────┘                                   │    │
│  │                                │                                         │    │
│  │              ┌─────────────────┼─────────────────┐                       │    │
│  │              ▼                 ▼                 ▼                       │    │
│  │         ┌─────────┐       ┌─────────┐       ┌─────────┐                  │    │
│  │         │ Ensign  │       │ Ensign  │       │ Ensign  │                  │    │
│  │         │  Alpha  │       │  Beta   │       │ Gamma   │                  │    │
│  │         └────┬────┘       └────┬────┘       └────┬────┘                  │    │
│  │              │                 │                 │                       │    │
│  └──────────────┼─────────────────┼─────────────────┼───────────────────────┘    │
│                 │                 │                 │                            │
│  ┌──────────────┼─────────────────┼─────────────────┼───────────────────────┐    │
│  │              ▼                 ▼                 ▼     PROTOCOL          │    │
│  │         ┌─────────────────────────────────────────────┐                  │    │
│  │         │                  ACPHOS                      │                  │    │
│  │         │         (Universal Protocol Translator)      │                  │    │
│  │         └─────────────────────┬───────────────────────┘                  │    │
│  │                               │                                          │    │
│  │         ┌─────────────────────┼─────────────────────┐                    │    │
│  │         ▼                     ▼                     ▼                    │    │
│  │    ┌─────────┐          ┌─────────┐          ┌─────────┐                 │    │
│  │    │ Claude  │          │  GPT-4  │          │ Ollama  │                 │    │
│  │    │  API    │          │   API   │          │ (Local) │                 │    │
│  │    └─────────┘          └─────────┘          └─────────┘                 │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                             KNOWLEDGE                                     │    │
│  │                                                                           │    │
│  │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │    │
│  │   │    DEFT     │     │  VCONTEXT   │     │  DASHDASH   │                │    │
│  │   │             │     │             │     │             │                │    │
│  │   │  Standards  │     │   Memory    │     │    Tool     │                │    │
│  │   │  & Prefs    │     │  & Plans    │     │  Discovery  │                │    │
│  │   └─────────────┘     └─────────────┘     └─────────────┘                │    │
│  │                                                                           │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Five Projects

### 1. Deft — Standards & Preferences

**What:** Layered framework for AI-assisted development with consistent standards.

**Role in System:** The "brain" that tells agents HOW to code.

```
deft/
├── main.md           ← General AI guidelines
├── core/
│   ├── user.md       ← Personal preferences (highest priority)
│   └── project.md    ← Project-specific rules
├── languages/
│   ├── python.md     ← Python standards
│   ├── go.md         ← Go standards
│   └── typescript.md ← TypeScript standards
└── workflows/
    └── testing.md    ← Testing guidelines
```

**Key Features:**
- Hierarchical rule precedence (user > project > language > general)
- RFC 2119 notation (!, ~, ≉, ⊗) for requirements
- Lazy loading — only load relevant files
- Self-improving — meta files capture learnings

**Integration Points:**
- JTK ensigns load Deft standards before executing tasks
- Acphos can inject Deft system prompts into LLM requests
- vContext plans can reference Deft workflows

---

### 2. JTK — Parallel Orchestration

**What:** Captain-ensign architecture for parallel coding agents.

**Role in System:** The "conductor" that coordinates multiple agents.

```
┌─────────────────────────────────────────────────────────────┐
│                        JTK Captain                           │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │ Plan Parser │   │ DAG Builder │   │ Task Queue  │       │
│   │ (vContext)  │   │             │   │             │       │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│          └─────────────────┴─────────────────┘              │
│                            │                                 │
│                  ┌─────────┴─────────┐                       │
│                  │  Work Dispatcher  │                       │
│                  └─────────┬─────────┘                       │
└────────────────────────────┼────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Ensign  │          │ Ensign  │          │ Ensign  │
   │ (Warp)  │          │(Cursor) │          │ (Aider) │
   └─────────┘          └─────────┘          └─────────┘
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
- Routes through Acphos for LLM backend flexibility
- Uses dashdash for tool discovery

---

### 3. vContext — Agent Memory

**What:** Open spec for todo lists, plans, and playbooks.

**Role in System:** The "memory" that structures agent work.

```
vContext Document Types:

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   TodoList (Short-term)      Plan (Medium-term)              │
│   ┌───────────────────┐      ┌───────────────────┐          │
│   │ □ Fix bug #123    │      │ Phase 1: Setup     │          │
│   │ ☑ Update deps     │      │   └─ Item 1.1      │          │
│   │ □ Write tests     │      │   └─ Item 1.2      │          │
│   └───────────────────┘      │ Phase 2: Core      │          │
│                              │   └─ Item 2.1      │          │
│   Playbook (Long-term)       │   └─ Item 2.2      │          │
│   ┌───────────────────┐      └───────────────────┘          │
│   │ Strategy: Testing │                                      │
│   │ Pattern: Error    │                                      │
│   │ Learning: Cache   │                                      │
│   └───────────────────┘                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
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
- Acphos can include vContext in LLM context

---

### 4. dashdash — Tool Discovery

**What:** Spec for AI agents to discover and use tools.

**Role in System:** The "interface" that teaches agents about tools.

```
Four Access Methods:

┌──────────────────────────────────────────────────────────────┐
│                                                               │
│   CLI                    Web                                  │
│   ┌────────────────┐     ┌────────────────┐                  │
│   │ tool --ai-help │     │ /llms.txt      │                  │
│   │                │     │                │                  │
│   │ YAML front     │     │ YAML front     │                  │
│   │ matter +       │     │ matter +       │                  │
│   │ markdown       │     │ markdown       │                  │
│   └────────────────┘     └────────────────┘                  │
│                                                               │
│   API                    MCP                                  │
│   ┌────────────────┐     ┌────────────────┐                  │
│   │ Cross-ref from │     │ ai_help method │                  │
│   │ CLI/Web docs   │     │                │                  │
│   │                │     │ dashdash ext   │                  │
│   │                │     │ in initialize  │                  │
│   └────────────────┘     └────────────────┘                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Unified discovery across CLI, Web, API, MCP
- "When to Use" sections for skill triggering
- Cross-references between access methods
- Go/Cobra integration for auto-generation

**Integration Points:**
- Deft skills can reference dashdash for tool usage
- JTK ensigns discover tools via dashdash
- Acphos can route to MCP servers discovered via dashdash
- vContext playbooks can store tool learnings

---

### 5. Acphos — Protocol Translation

**What:** Universal proxy between any LLM protocols.

**Role in System:** The "translator" that decouples agents from backends.

```
┌─────────────────────────────────────────────────────────────┐
│                         ACPHOS                               │
│                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐        │
│   │    acphos-front     │    │     acphos-back     │        │
│   │                     │    │                     │        │
│   │  Messages API  ───► │    │ ───►  Anthropic     │        │
│   │  Responses API ───► │ ── │ ───►  OpenAI        │        │
│   │  Chat Complet. ───► │    │ ───►  Ollama        │        │
│   │  ACP           ───► │    │ ───►  Other ACP     │        │
│   │                     │    │                     │        │
│   └─────────────────────┘    └─────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Bidirectional protocol translation
- Zero capability loss via `_meta` extensions
- Filter graph architecture (Rete.js / Go channels)
- Visual graph editing for routing
- Multi-backend routing and load balancing

**Integration Points:**
- JTK routes all LLM calls through Acphos
- Can inject Deft system prompts
- Supports MCP tools discovered via dashdash
- Can include vContext in requests

---

## How They Fit Together

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  1. Developer creates a vContext PLAN                                        │
│     └─► Defines phases, items, dependencies                                  │
│                                                                              │
│  2. JTK CAPTAIN parses the plan                                              │
│     └─► Builds dependency DAG                                                │
│     └─► Assigns tasks to ensigns                                             │
│                                                                              │
│  3. Each ENSIGN receives a task                                              │
│     └─► Loads DEFT standards for context                                     │
│     └─► Discovers tools via DASHDASH                                         │
│     └─► Sends LLM request through ACPHOS                                     │
│                                                                              │
│  4. ACPHOS routes to appropriate backend                                     │
│     └─► Injects Deft system prompt                                           │
│     └─► Translates protocol (e.g., ACP → Anthropic)                          │
│     └─► Streams response back                                                │
│                                                                              │
│  5. Ensign executes the task                                                 │
│     └─► Uses tools discovered via dashdash                                   │
│     └─► Follows Deft standards                                               │
│     └─► Reports completion to captain                                        │
│                                                                              │
│  6. Captain updates vContext TODOLIST                                        │
│     └─► Marks items complete                                                 │
│     └─► Triggers dependent tasks                                             │
│     └─► Captures learnings in PLAYBOOK                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Integration Matrix

| Component | Uses Deft | Uses JTK | Uses vContext | Uses dashdash | Uses Acphos |
|-----------|-----------|----------|---------------|---------------|-------------|
| **Deft** | — | Standards for ensigns | Workflow → todos | Tool usage docs | System prompts |
| **JTK** | Ensign standards | — | Plan execution | Tool discovery | LLM routing |
| **vContext** | Workflow refs | Plan format | — | — | Context inclusion |
| **dashdash** | Skill definitions | Tool for ensigns | — | — | MCP routing |
| **Acphos** | Prompt injection | Backend for JTK | Context in requests | MCP discovery | — |

---

## Roadmap

### Phase 1: Foundation (Current)

| Project | Status | Next Steps |
|---------|--------|------------|
| **Deft** | ✅ v1.0 | Expand language support, add more workflows |
| **JTK** | 🚧 v0.2 | Stabilize mission orchestration, production testing |
| **vContext** | 📝 v0.4 | Finalize spec, build reference parsers |
| **dashdash** | 📝 v0.2 | Implement Go/Cobra integration, test with real tools |
| **Acphos** | 📝 Design | Implement core engine, build adapters |

### Phase 2: Integration

```
Q1 2026:
├── JTK + vContext: Native plan execution
├── JTK + Deft: Ensign standard loading
└── Acphos core: TypeScript implementation

Q2 2026:
├── JTK + Acphos: LLM routing integration
├── dashdash + Deft: Auto-generate skill files
└── Acphos adapters: Anthropic, OpenAI, Ollama

Q3 2026:
├── Full integration testing
├── dashdash + JTK: Tool discovery for ensigns
└── vContext + Playbooks: Learning accumulation

Q4 2026:
├── Production deployment
├── Acphos Go implementation
└── Visual graph editor
```

### Phase 3: Ecosystem

```
2027+:
├── Public Deft standard library
├── vContext tool ecosystem
├── dashdash adoption by tool authors
├── Acphos as industry standard
└── JTK cloud service
```

---

## The Vision

**Today:** Developers use individual AI tools (Cursor, Copilot, Claude) in isolation, losing context between sessions, re-explaining preferences, manually coordinating parallel work.

**With this ecosystem:**

1. **Deft** ensures consistent quality across all AI interactions
2. **vContext** maintains structured memory across sessions and tools
3. **dashdash** enables any AI to discover and use any tool
4. **Acphos** lets you use any AI backend without lock-in
5. **JTK** coordinates parallel agents for complex projects

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
| Acphos | [visionik/acphos](https://github.com/visionik/acphos) | Protocol translation |

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

| Layer | Project | Purpose |
|-------|---------|---------|
| **Orchestration** | JTK | Coordinate parallel agents |
| **Protocol** | Acphos | Translate between LLM APIs |
| **Standards** | Deft | Define how to code |
| **Memory** | vContext | Structure agent work |
| **Discovery** | dashdash | Find and use tools |

Together: **A complete, open, interoperable AI coding system.**
