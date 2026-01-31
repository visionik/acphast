# Acphast Go Implementation

**Go-based acphast-back using flow-based programming**

## Overview

This implementation uses Go for the high-performance backend processing while keeping the option for a Rete.js frontend for visual configuration.

```
┌─────────────────────┐      JSON Config      ┌─────────────────────┐
│   Rete.js Editor    │ ───────────────────►  │    Go Backend       │
│   (Optional UI)     │                       │   (acphast-back)     │
└─────────────────────┘                       └─────────────────────┘
```

---

## Project Structure

```
acphast/
├── cmd/
│   └── acphast/
│       └── main.go              # Entry point
├── internal/
│   ├── acp/
│   │   ├── types.go             # ACP message types
│   │   ├── request.go           # Request handling
│   │   └── response.go          # Response building
│   ├── graph/
│   │   ├── engine.go            # Flow engine
│   │   ├── node.go              # Node interface
│   │   ├── port.go              # Port types
│   │   └── loader.go            # Load graph from JSON
│   ├── nodes/
│   │   ├── receiver.go          # Input nodes
│   │   ├── router.go            # Routing nodes
│   │   ├── adapters/
│   │   │   ├── anthropic.go
│   │   │   ├── openai.go
│   │   │   ├── ollama.go
│   │   │   └── acp.go
│   │   ├── transform.go         # Transform nodes
│   │   └── responder.go         # Output nodes
│   ├── transport/
│   │   ├── stdio.go             # JSON-RPC over stdio
│   │   ├── http.go              # HTTP + SSE
│   │   └── websocket.go         # WebSocket
│   └── config/
│       ├── config.go            # Configuration types
│       └── loader.go            # Load from TOML/YAML
├── pkg/
│   └── acphast/
│       └── client.go            # Client library
├── graphs/
│   └── default.json             # Default graph config
├── go.mod
└── go.sum
```

---

## Core Types

```go
// internal/acp/types.go

package acp

import "encoding/json"

// ACPRequest represents an incoming ACP request
type ACPRequest struct {
	ID     json.RawMessage `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

// ACPResponse represents an outgoing ACP response
type ACPResponse struct {
	ID     json.RawMessage `json:"id"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  *ACPError       `json:"error,omitempty"`
}

// ACPNotification represents a streaming notification
type ACPNotification struct {
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

// ACPError represents an error response
type ACPError struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// PromptParams represents session/prompt parameters
type PromptParams struct {
	SessionID string         `json:"sessionId"`
	Prompt    []ContentBlock `json:"prompt"`
	Meta      *Meta          `json:"_meta,omitempty"`
}

// ContentBlock represents ACP content
type ContentBlock struct {
	Type     string          `json:"type"`
	Text     string          `json:"text,omitempty"`
	Data     string          `json:"data,omitempty"`
	MimeType string          `json:"mimeType,omitempty"`
	Resource json.RawMessage `json:"resource,omitempty"`
	Meta     *Meta           `json:"_meta,omitempty"`
}

// Meta holds provider-specific metadata
type Meta struct {
	Proxy     *ProxyMeta     `json:"proxy,omitempty"`
	Anthropic *AnthropicMeta `json:"anthropic,omitempty"`
	OpenAI    *OpenAIMeta    `json:"openai,omitempty"`
	Ollama    *OllamaMeta    `json:"ollama,omitempty"`
}

// ProxyMeta holds proxy-specific metadata
type ProxyMeta struct {
	Version   string  `json:"version,omitempty"`
	Backend   string  `json:"backend,omitempty"`
	Model     string  `json:"model,omitempty"`
	RequestID string  `json:"requestId,omitempty"`
	Usage     *Usage  `json:"usage,omitempty"`
	Timing    *Timing `json:"timing,omitempty"`
}

// AnthropicMeta holds Anthropic-specific options
type AnthropicMeta struct {
	Model             string `json:"model,omitempty"`
	MaxTokens         int    `json:"maxTokens,omitempty"`
	Thinking          string `json:"thinking,omitempty"` // "disabled", "enabled"
	MaxThinkingTokens int    `json:"maxThinkingTokens,omitempty"`
}

// OpenAIMeta holds OpenAI-specific options
type OpenAIMeta struct {
	Model     string           `json:"model,omitempty"`
	Reasoning *ReasoningConfig `json:"reasoning,omitempty"`
}

// ReasoningConfig for OpenAI reasoning models
type ReasoningConfig struct {
	Effort  string `json:"effort,omitempty"`  // "low", "medium", "high"
	Summary string `json:"summary,omitempty"` // "disabled", "auto", "always"
}

// OllamaMeta holds Ollama-specific options
type OllamaMeta struct {
	Model       string  `json:"model,omitempty"`
	Temperature float64 `json:"temperature,omitempty"`
}

// Usage represents token usage
type Usage struct {
	InputTokens    int `json:"inputTokens,omitempty"`
	OutputTokens   int `json:"outputTokens,omitempty"`
	ThinkingTokens int `json:"thinkingTokens,omitempty"`
}

// Timing represents request timing
type Timing struct {
	TotalMs int64 `json:"totalMs,omitempty"`
}
```

---

## Flow Engine

```go
// internal/graph/engine.go

package graph

import (
	"context"
	"fmt"
	"sync"
)

// Message represents data flowing through the graph
type Message struct {
	Ctx      *Context
	Request  *acp.ACPRequest
	Backend  string
	Response interface{}
}

// Context holds request-scoped data
type Context struct {
	context.Context
	RequestID string
	SessionID string
	StartTime time.Time
	Meta      map[string]interface{}
	OnUpdate  func(*acp.ACPNotification)
	
	mu sync.Mutex
}

// Node is the interface all nodes must implement
type Node interface {
	ID() string
	Process(ctx context.Context, inputs map[string]<-chan *Message) (map[string]chan *Message, error)
}

// StreamingNode is for nodes that produce streaming output
type StreamingNode interface {
	Node
	ProcessStream(ctx context.Context, input *Message, emit func(*acp.ACPNotification)) error
}

// Engine manages the flow graph
type Engine struct {
	nodes       map[string]Node
	connections []Connection
	mu          sync.RWMutex
}

// Connection represents an edge in the graph
type Connection struct {
	FromNode string
	FromPort string
	ToNode   string
	ToPort   string
}

// NewEngine creates a new flow engine
func NewEngine() *Engine {
	return &Engine{
		nodes:       make(map[string]Node),
		connections: make([]Connection, 0),
	}
}

// AddNode adds a node to the graph
func (e *Engine) AddNode(node Node) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.nodes[node.ID()] = node
}

// Connect creates a connection between nodes
func (e *Engine) Connect(fromNode, fromPort, toNode, toPort string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	if _, ok := e.nodes[fromNode]; !ok {
		return fmt.Errorf("node %s not found", fromNode)
	}
	if _, ok := e.nodes[toNode]; !ok {
		return fmt.Errorf("node %s not found", toNode)
	}
	
	e.connections = append(e.connections, Connection{
		FromNode: fromNode,
		FromPort: fromPort,
		ToNode:   toNode,
		ToPort:   toPort,
	})
	return nil
}

// Process runs a message through the graph
func (e *Engine) Process(ctx context.Context, msg *Message) error {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	// Build channel map for each node
	nodeInputs := make(map[string]map[string]chan *Message)
	nodeOutputs := make(map[string]map[string]chan *Message)
	
	// Initialize channels
	for _, conn := range e.connections {
		ch := make(chan *Message, 1)
		
		if nodeOutputs[conn.FromNode] == nil {
			nodeOutputs[conn.FromNode] = make(map[string]chan *Message)
		}
		nodeOutputs[conn.FromNode][conn.FromPort] = ch
		
		if nodeInputs[conn.ToNode] == nil {
			nodeInputs[conn.ToNode] = make(map[string]chan *Message)
		}
		nodeInputs[conn.ToNode][conn.ToPort] = ch
	}
	
	// Start all nodes
	var wg sync.WaitGroup
	errCh := make(chan error, len(e.nodes))
	
	for id, node := range e.nodes {
		wg.Add(1)
		go func(id string, node Node) {
			defer wg.Done()
			
			// Convert to read-only channels for inputs
			inputs := make(map[string]<-chan *Message)
			for port, ch := range nodeInputs[id] {
				inputs[port] = ch
			}
			
			outputs, err := node.Process(ctx, inputs)
			if err != nil {
				errCh <- fmt.Errorf("node %s: %w", id, err)
				return
			}
			
			// Wire outputs to connections
			for port, ch := range outputs {
				if outCh, ok := nodeOutputs[id][port]; ok {
					go func(from, to chan *Message) {
						for msg := range from {
							to <- msg
						}
						close(to)
					}(ch, outCh)
				}
			}
		}(id, node)
	}
	
	// Inject initial message
	// (assuming "receiver" node has an "inject" method)
	if receiver, ok := e.nodes["receiver"].(*ReceiverNode); ok {
		receiver.Inject(msg)
	}
	
	wg.Wait()
	close(errCh)
	
	// Collect errors
	for err := range errCh {
		if err != nil {
			return err
		}
	}
	
	return nil
}
```

---

## Graph Loader

```go
// internal/graph/loader.go

package graph

import (
	"encoding/json"
	"os"
)

// GraphConfig represents a serialized graph
type GraphConfig struct {
	Version     string           `json:"version"`
	Nodes       []NodeConfig     `json:"nodes"`
	Connections []ConnectionConfig `json:"connections"`
}

// NodeConfig represents a node in the config
type NodeConfig struct {
	ID     string                 `json:"id"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config,omitempty"`
}

// ConnectionConfig represents a connection in the config
type ConnectionConfig struct {
	From string `json:"from"` // "nodeId:portName"
	To   string `json:"to"`   // "nodeId:portName"
}

// LoadGraph loads a graph from a JSON file
func LoadGraph(path string) (*Engine, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	
	var config GraphConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}
	
	engine := NewEngine()
	
	// Create nodes
	for _, nc := range config.Nodes {
		node, err := createNode(nc)
		if err != nil {
			return nil, err
		}
		engine.AddNode(node)
	}
	
	// Create connections
	for _, cc := range config.Connections {
		fromNode, fromPort := parsePort(cc.From)
		toNode, toPort := parsePort(cc.To)
		
		if err := engine.Connect(fromNode, fromPort, toNode, toPort); err != nil {
			return nil, err
		}
	}
	
	return engine, nil
}

// createNode creates a node from config
func createNode(nc NodeConfig) (Node, error) {
	switch nc.Type {
	case "ACPReceiver":
		return NewReceiverNode(nc.ID), nil
	case "BackendSelector":
		return NewBackendSelectorNode(nc.ID, nc.Config), nil
	case "AnthropicAdapter":
		return NewAnthropicAdapter(nc.ID, nc.Config), nil
	case "OpenAIAdapter":
		return NewOpenAIAdapter(nc.ID, nc.Config), nil
	case "OllamaAdapter":
		return NewOllamaAdapter(nc.ID, nc.Config), nil
	case "MetaInjector":
		return NewMetaInjectorNode(nc.ID, nc.Config), nil
	case "ACPResponder":
		return NewResponderNode(nc.ID), nil
	default:
		return nil, fmt.Errorf("unknown node type: %s", nc.Type)
	}
}

func parsePort(s string) (node, port string) {
	parts := strings.SplitN(s, ":", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return s, "default"
}
```

---

## Node Implementations

### Base Node

```go
// internal/nodes/base.go

package nodes

import (
	"context"
	"github.com/acphast/acphast/internal/graph"
)

// BaseNode provides common functionality
type BaseNode struct {
	id string
}

func (n *BaseNode) ID() string {
	return n.id
}
```

### Receiver Node

```go
// internal/nodes/receiver.go

package nodes

import (
	"context"
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
)

// ReceiverNode receives incoming ACP requests
type ReceiverNode struct {
	BaseNode
	inputCh  chan *graph.Message
	outputCh chan *graph.Message
}

// NewReceiverNode creates a new receiver
func NewReceiverNode(id string) *ReceiverNode {
	return &ReceiverNode{
		BaseNode: BaseNode{id: id},
		inputCh:  make(chan *graph.Message, 10),
		outputCh: make(chan *graph.Message, 10),
	}
}

// Inject injects a message into the graph
func (n *ReceiverNode) Inject(msg *graph.Message) {
	n.inputCh <- msg
}

// Process implements Node interface
func (n *ReceiverNode) Process(ctx context.Context, inputs map[string]<-chan *graph.Message) (map[string]chan *graph.Message, error) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				close(n.outputCh)
				return
			case msg := <-n.inputCh:
				n.outputCh <- msg
			}
		}
	}()
	
	return map[string]chan *graph.Message{
		"out": n.outputCh,
	}, nil
}
```

### Backend Selector Node

```go
// internal/nodes/router.go

package nodes

import (
	"context"
	"encoding/json"
	
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
)

// BackendSelectorConfig holds selector configuration
type BackendSelectorConfig struct {
	DefaultBackend string   `json:"defaultBackend"`
	Backends       []string `json:"backends"`
}

// BackendSelectorNode routes messages to appropriate backends
type BackendSelectorNode struct {
	BaseNode
	config   BackendSelectorConfig
	outputs  map[string]chan *graph.Message
}

// NewBackendSelectorNode creates a new backend selector
func NewBackendSelectorNode(id string, config map[string]interface{}) *BackendSelectorNode {
	// Parse config
	data, _ := json.Marshal(config)
	var cfg BackendSelectorConfig
	json.Unmarshal(data, &cfg)
	
	outputs := make(map[string]chan *graph.Message)
	for _, backend := range cfg.Backends {
		outputs[backend] = make(chan *graph.Message, 10)
	}
	
	return &BackendSelectorNode{
		BaseNode: BaseNode{id: id},
		config:   cfg,
		outputs:  outputs,
	}
}

// Process implements Node interface
func (n *BackendSelectorNode) Process(ctx context.Context, inputs map[string]<-chan *graph.Message) (map[string]chan *graph.Message, error) {
	inCh := inputs["in"]
	
	go func() {
		for msg := range inCh {
			backend := n.selectBackend(msg)
			msg.Backend = backend
			
			if outCh, ok := n.outputs[backend]; ok {
				outCh <- msg
			}
		}
		
		// Close all outputs
		for _, ch := range n.outputs {
			close(ch)
		}
	}()
	
	return n.outputs, nil
}

func (n *BackendSelectorNode) selectBackend(msg *graph.Message) string {
	// Parse request params to get meta
	var params acp.PromptParams
	if err := json.Unmarshal(msg.Request.Params, &params); err == nil {
		if params.Meta != nil && params.Meta.Proxy != nil && params.Meta.Proxy.Backend != "" {
			return params.Meta.Proxy.Backend
		}
		
		// Check for thinking → anthropic
		if params.Meta != nil && params.Meta.Anthropic != nil && params.Meta.Anthropic.Thinking == "enabled" {
			return "anthropic"
		}
		
		// Check for reasoning → openai
		if params.Meta != nil && params.Meta.OpenAI != nil && params.Meta.OpenAI.Reasoning != nil {
			return "openai"
		}
	}
	
	return n.config.DefaultBackend
}
```

### Anthropic Adapter

```go
// internal/nodes/adapters/anthropic.go

package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	
	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
	"github.com/acphast/acphast/internal/nodes"
)

// AnthropicConfig holds adapter configuration
type AnthropicConfig struct {
	APIKey          string `json:"apiKey"`
	DefaultModel    string `json:"defaultModel"`
	DefaultMaxTokens int   `json:"defaultMaxTokens"`
}

// AnthropicAdapter handles Anthropic API calls
type AnthropicAdapter struct {
	nodes.BaseNode
	config AnthropicConfig
	client *anthropic.Client
}

// NewAnthropicAdapter creates a new Anthropic adapter
func NewAnthropicAdapter(id string, config map[string]interface{}) *AnthropicAdapter {
	data, _ := json.Marshal(config)
	var cfg AnthropicConfig
	json.Unmarshal(data, &cfg)
	
	// Use env var if not specified
	apiKey := cfg.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}
	
	client := anthropic.NewClient(option.WithAPIKey(apiKey))
	
	return &AnthropicAdapter{
		BaseNode: nodes.BaseNode{ID: id},
		config:   cfg,
		client:   client,
	}
}

// Process implements Node interface
func (a *AnthropicAdapter) Process(ctx context.Context, inputs map[string]<-chan *graph.Message) (map[string]chan *graph.Message, error) {
	inCh := inputs["in"]
	outCh := make(chan *graph.Message, 10)
	
	go func() {
		defer close(outCh)
		
		for msg := range inCh {
			if err := a.processMessage(ctx, msg); err != nil {
				msg.Ctx.Meta["error"] = err.Error()
			}
			outCh <- msg
		}
	}()
	
	return map[string]chan *graph.Message{"out": outCh}, nil
}

func (a *AnthropicAdapter) processMessage(ctx context.Context, msg *graph.Message) error {
	// Parse prompt params
	var params acp.PromptParams
	if err := json.Unmarshal(msg.Request.Params, &params); err != nil {
		return err
	}
	
	// Build Anthropic request
	request := a.buildRequest(&params)
	
	// Create streaming message
	stream := a.client.Messages.NewStreaming(ctx, request)
	
	// Process stream
	for stream.Next() {
		event := stream.Current()
		a.handleEvent(event, msg.Ctx)
	}
	
	if err := stream.Err(); err != nil {
		return err
	}
	
	// Get final message for usage
	finalMsg := stream.FinalMessage()
	a.emitUsage(finalMsg, msg.Ctx)
	
	return nil
}

func (a *AnthropicAdapter) buildRequest(params *acp.PromptParams) anthropic.MessageNewParams {
	model := a.config.DefaultModel
	maxTokens := a.config.DefaultMaxTokens
	
	if params.Meta != nil && params.Meta.Anthropic != nil {
		if params.Meta.Anthropic.Model != "" {
			model = params.Meta.Anthropic.Model
		}
		if params.Meta.Anthropic.MaxTokens > 0 {
			maxTokens = params.Meta.Anthropic.MaxTokens
		}
	}
	
	// Convert ACP content to Anthropic format
	content := make([]anthropic.ContentBlockParamUnion, 0)
	for _, block := range params.Prompt {
		switch block.Type {
		case "text":
			content = append(content, anthropic.NewTextBlock(block.Text))
		case "image":
			content = append(content, anthropic.NewImageBlockBase64(block.MimeType, block.Data))
		}
	}
	
	request := anthropic.MessageNewParams{
		Model:     anthropic.F(model),
		MaxTokens: anthropic.F(int64(maxTokens)),
		Messages: anthropic.F([]anthropic.MessageParam{
			anthropic.NewUserMessage(content...),
		}),
	}
	
	// Add thinking if enabled
	if params.Meta != nil && params.Meta.Anthropic != nil && params.Meta.Anthropic.Thinking == "enabled" {
		budgetTokens := 10000
		if params.Meta.Anthropic.MaxThinkingTokens > 0 {
			budgetTokens = params.Meta.Anthropic.MaxThinkingTokens
		}
		request.Thinking = anthropic.F(anthropic.ThinkingConfigParamUnion{
			Type:         "enabled",
			BudgetTokens: int64(budgetTokens),
		})
	}
	
	return request
}

func (a *AnthropicAdapter) handleEvent(event anthropic.MessageStreamEvent, ctx *graph.Context) {
	switch e := event.AsUnion().(type) {
	case anthropic.ContentBlockDeltaEvent:
		switch delta := e.Delta.AsUnion().(type) {
		case anthropic.TextDelta:
			a.emitContentChunk(delta.Text, ctx)
		case anthropic.ThinkingDelta:
			a.emitThoughtChunk(delta.Thinking, ctx)
		}
	case anthropic.ContentBlockStartEvent:
		if e.ContentBlock.Type == "tool_use" {
			a.emitToolCallStart(e.ContentBlock, ctx)
		}
	}
}

func (a *AnthropicAdapter) emitContentChunk(text string, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "content_chunk",
			"content": map[string]interface{}{
				"type": "text",
				"text": text,
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}

func (a *AnthropicAdapter) emitThoughtChunk(text string, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "thought_chunk",
			"content": map[string]interface{}{
				"type": "text",
				"text": text,
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}

func (a *AnthropicAdapter) emitToolCallStart(block anthropic.ContentBlock, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "tool_call_start",
			"toolCall": map[string]interface{}{
				"id":   block.ID,
				"name": block.Name,
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}

func (a *AnthropicAdapter) emitUsage(msg *anthropic.Message, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "usage",
			"_meta": map[string]interface{}{
				"proxy": map[string]interface{}{
					"usage": map[string]interface{}{
						"inputTokens":  msg.Usage.InputTokens,
						"outputTokens": msg.Usage.OutputTokens,
					},
				},
				"anthropic": map[string]interface{}{
					"cacheReadInputTokens":     msg.Usage.CacheReadInputTokens,
					"cacheCreationInputTokens": msg.Usage.CacheCreationInputTokens,
				},
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}
```

### OpenAI Adapter

```go
// internal/nodes/adapters/openai.go

package adapters

import (
	"context"
	"encoding/json"
	"os"
	
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
	"github.com/acphast/acphast/internal/nodes"
)

// OpenAIConfig holds adapter configuration
type OpenAIConfig struct {
	APIKey       string `json:"apiKey"`
	BaseURL      string `json:"baseURL"`
	DefaultModel string `json:"defaultModel"`
}

// OpenAIAdapter handles OpenAI API calls
type OpenAIAdapter struct {
	nodes.BaseNode
	config OpenAIConfig
	client *openai.Client
}

// NewOpenAIAdapter creates a new OpenAI adapter
func NewOpenAIAdapter(id string, config map[string]interface{}) *OpenAIAdapter {
	data, _ := json.Marshal(config)
	var cfg OpenAIConfig
	json.Unmarshal(data, &cfg)
	
	apiKey := cfg.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	
	opts := []option.RequestOption{option.WithAPIKey(apiKey)}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}
	
	client := openai.NewClient(opts...)
	
	return &OpenAIAdapter{
		BaseNode: nodes.BaseNode{ID: id},
		config:   cfg,
		client:   client,
	}
}

// Process implements Node interface
func (a *OpenAIAdapter) Process(ctx context.Context, inputs map[string]<-chan *graph.Message) (map[string]chan *graph.Message, error) {
	inCh := inputs["in"]
	outCh := make(chan *graph.Message, 10)
	
	go func() {
		defer close(outCh)
		
		for msg := range inCh {
			if err := a.processMessage(ctx, msg); err != nil {
				msg.Ctx.Meta["error"] = err.Error()
			}
			outCh <- msg
		}
	}()
	
	return map[string]chan *graph.Message{"out": outCh}, nil
}

func (a *OpenAIAdapter) processMessage(ctx context.Context, msg *graph.Message) error {
	var params acp.PromptParams
	if err := json.Unmarshal(msg.Request.Params, &params); err != nil {
		return err
	}
	
	// Build request
	request := a.buildRequest(&params)
	
	// Stream response
	stream := a.client.Responses.NewStreaming(ctx, request)
	
	for stream.Next() {
		event := stream.Current()
		a.handleEvent(event, msg.Ctx)
	}
	
	return stream.Err()
}

func (a *OpenAIAdapter) buildRequest(params *acp.PromptParams) openai.ResponseNewParams {
	model := a.config.DefaultModel
	
	if params.Meta != nil && params.Meta.OpenAI != nil && params.Meta.OpenAI.Model != "" {
		model = params.Meta.OpenAI.Model
	}
	
	// Convert content
	var content []openai.ResponseInputContentUnionParam
	for _, block := range params.Prompt {
		if block.Type == "text" {
			content = append(content, openai.ResponseInputContentUnionParam{
				Type: openai.F("input_text"),
				Text: openai.F(block.Text),
			})
		}
	}
	
	request := openai.ResponseNewParams{
		Model: openai.F(model),
		Input: openai.F([]openai.ResponseInputUnionParam{
			{
				Type:    openai.F("message"),
				Role:    openai.F("user"),
				Content: openai.F(content),
			},
		}),
	}
	
	// Add reasoning if specified
	if params.Meta != nil && params.Meta.OpenAI != nil && params.Meta.OpenAI.Reasoning != nil {
		request.Reasoning = openai.F(openai.ReasoningParam{
			Effort: openai.F(params.Meta.OpenAI.Reasoning.Effort),
		})
	}
	
	return request
}

func (a *OpenAIAdapter) handleEvent(event openai.ResponseStreamEvent, ctx *graph.Context) {
	switch event.Type {
	case "response.output_text.delta":
		a.emitContentChunk(event.Delta.(string), ctx)
	case "response.reasoning_summary_text.delta":
		a.emitThoughtChunk(event.Delta.(string), ctx)
	}
}

func (a *OpenAIAdapter) emitContentChunk(text string, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "content_chunk",
			"content": map[string]interface{}{
				"type": "text",
				"text": text,
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}

func (a *OpenAIAdapter) emitThoughtChunk(text string, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "thought_chunk",
			"content": map[string]interface{}{
				"type": "text",
				"text": text,
			},
			"_meta": map[string]interface{}{
				"openai": map[string]interface{}{
					"reasoningSummary": true,
				},
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}
```

### Ollama Adapter

```go
// internal/nodes/adapters/ollama.go

package adapters

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
	"github.com/acphast/acphast/internal/nodes"
)

// OllamaConfig holds adapter configuration
type OllamaConfig struct {
	BaseURL      string `json:"baseURL"`
	DefaultModel string `json:"defaultModel"`
}

// OllamaAdapter handles Ollama API calls
type OllamaAdapter struct {
	nodes.BaseNode
	config OllamaConfig
	client *http.Client
}

// NewOllamaAdapter creates a new Ollama adapter
func NewOllamaAdapter(id string, config map[string]interface{}) *OllamaAdapter {
	data, _ := json.Marshal(config)
	var cfg OllamaConfig
	json.Unmarshal(data, &cfg)
	
	if cfg.BaseURL == "" {
		cfg.BaseURL = "http://localhost:11434"
	}
	
	return &OllamaAdapter{
		BaseNode: nodes.BaseNode{ID: id},
		config:   cfg,
		client:   &http.Client{},
	}
}

// Process implements Node interface
func (a *OllamaAdapter) Process(ctx context.Context, inputs map[string]<-chan *graph.Message) (map[string]chan *graph.Message, error) {
	inCh := inputs["in"]
	outCh := make(chan *graph.Message, 10)
	
	go func() {
		defer close(outCh)
		
		for msg := range inCh {
			if err := a.processMessage(ctx, msg); err != nil {
				msg.Ctx.Meta["error"] = err.Error()
			}
			outCh <- msg
		}
	}()
	
	return map[string]chan *graph.Message{"out": outCh}, nil
}

func (a *OllamaAdapter) processMessage(ctx context.Context, msg *graph.Message) error {
	var params acp.PromptParams
	if err := json.Unmarshal(msg.Request.Params, &params); err != nil {
		return err
	}
	
	// Build prompt text
	var prompt string
	for _, block := range params.Prompt {
		if block.Type == "text" {
			prompt += block.Text + "\n"
		}
	}
	
	model := a.config.DefaultModel
	if params.Meta != nil && params.Meta.Ollama != nil && params.Meta.Ollama.Model != "" {
		model = params.Meta.Ollama.Model
	}
	
	// Make request
	reqBody := map[string]interface{}{
		"model":  model,
		"prompt": prompt,
		"stream": true,
	}
	
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", a.config.BaseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	// Stream response
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		var chunk struct {
			Response string `json:"response"`
			Done     bool   `json:"done"`
		}
		if err := json.Unmarshal(scanner.Bytes(), &chunk); err != nil {
			continue
		}
		
		if chunk.Response != "" {
			a.emitContentChunk(chunk.Response, msg.Ctx)
		}
	}
	
	return scanner.Err()
}

func (a *OllamaAdapter) emitContentChunk(text string, ctx *graph.Context) {
	notification := &acp.ACPNotification{
		Method: "session/update",
	}
	
	params := map[string]interface{}{
		"sessionId": ctx.SessionID,
		"update": map[string]interface{}{
			"type": "content_chunk",
			"content": map[string]interface{}{
				"type": "text",
				"text": text,
			},
		},
	}
	
	notification.Params, _ = json.Marshal(params)
	ctx.OnUpdate(notification)
}
```

---

## Transport: stdio

```go
// internal/transport/stdio.go

package transport

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"
	
	"github.com/acphast/acphast/internal/acp"
	"github.com/acphast/acphast/internal/graph"
)

// StdioTransport handles JSON-RPC over stdin/stdout
type StdioTransport struct {
	engine *graph.Engine
	reader *bufio.Reader
	writer io.Writer
}

// NewStdioTransport creates a new stdio transport
func NewStdioTransport(engine *graph.Engine) *StdioTransport {
	return &StdioTransport{
		engine: engine,
		reader: bufio.NewReader(os.Stdin),
		writer: os.Stdout,
	}
}

// Start begins processing messages
func (t *StdioTransport) Start(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			msg, err := t.readMessage()
			if err == io.EOF {
				return nil
			}
			if err != nil {
				continue // Skip malformed messages
			}
			
			go t.handleMessage(ctx, msg)
		}
	}
}

func (t *StdioTransport) readMessage() (*acp.ACPRequest, error) {
	// Read headers
	var contentLength int
	for {
		line, err := t.reader.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimSpace(line)
		
		if line == "" {
			break // End of headers
		}
		
		if strings.HasPrefix(line, "Content-Length:") {
			contentLength, _ = strconv.Atoi(strings.TrimSpace(line[15:]))
		}
	}
	
	if contentLength == 0 {
		return nil, fmt.Errorf("missing Content-Length")
	}
	
	// Read body
	body := make([]byte, contentLength)
	if _, err := io.ReadFull(t.reader, body); err != nil {
		return nil, err
	}
	
	var request acp.ACPRequest
	if err := json.Unmarshal(body, &request); err != nil {
		return nil, err
	}
	
	return &request, nil
}

func (t *StdioTransport) handleMessage(ctx context.Context, request *acp.ACPRequest) {
	// Create message context
	msgCtx := &graph.Context{
		Context:   ctx,
		RequestID: fmt.Sprintf("%v", request.ID),
		StartTime: time.Now(),
		Meta:      make(map[string]interface{}),
		OnUpdate: func(notification *acp.ACPNotification) {
			t.sendNotification(notification)
		},
	}
	
	// Parse session ID from params
	var params map[string]interface{}
	if err := json.Unmarshal(request.Params, &params); err == nil {
		if sid, ok := params["sessionId"].(string); ok {
			msgCtx.SessionID = sid
		}
	}
	
	// Create pipeline message
	msg := &graph.Message{
		Ctx:     msgCtx,
		Request: request,
	}
	
	// Process through engine
	if err := t.engine.Process(ctx, msg); err != nil {
		t.sendError(request.ID, -32000, err.Error())
		return
	}
	
	// Send success response
	t.sendResponse(request.ID, map[string]interface{}{
		"stopReason": "end_turn",
		"_meta": map[string]interface{}{
			"proxy": map[string]interface{}{
				"timing": map[string]interface{}{
					"totalMs": time.Since(msgCtx.StartTime).Milliseconds(),
				},
			},
		},
	})
}

func (t *StdioTransport) sendResponse(id json.RawMessage, result interface{}) {
	response := acp.ACPResponse{ID: id}
	response.Result, _ = json.Marshal(result)
	t.sendJSON(response)
}

func (t *StdioTransport) sendError(id json.RawMessage, code int, message string) {
	response := acp.ACPResponse{
		ID: id,
		Error: &acp.ACPError{
			Code:    code,
			Message: message,
		},
	}
	t.sendJSON(response)
}

func (t *StdioTransport) sendNotification(notification *acp.ACPNotification) {
	t.sendJSON(notification)
}

func (t *StdioTransport) sendJSON(v interface{}) {
	body, _ := json.Marshal(v)
	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(body))
	t.writer.Write([]byte(header))
	t.writer.Write(body)
}
```

---

## Main Entry Point

```go
// cmd/acphast/main.go

package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	
	"github.com/acphast/acphast/internal/graph"
	"github.com/acphast/acphast/internal/transport"
)

func main() {
	graphFile := flag.String("graph", "graphs/default.json", "Path to graph configuration")
	flag.Parse()
	
	// Load graph
	engine, err := graph.LoadGraph(*graphFile)
	if err != nil {
		log.Fatalf("Failed to load graph: %v", err)
	}
	
	// Create transport
	t := transport.NewStdioTransport(engine)
	
	// Handle shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		cancel()
	}()
	
	// Start transport
	log.Println("Acphast started on stdio")
	if err := t.Start(ctx); err != nil && err != context.Canceled {
		log.Fatalf("Transport error: %v", err)
	}
}
```

---

## Graph Configuration

```json
// graphs/default.json

{
  "version": "1.0.0",
  "nodes": [
    {
      "id": "receiver",
      "type": "ACPReceiver"
    },
    {
      "id": "selector",
      "type": "BackendSelector",
      "config": {
        "defaultBackend": "anthropic",
        "backends": ["anthropic", "openai", "ollama"]
      }
    },
    {
      "id": "anthropic",
      "type": "AnthropicAdapter",
      "config": {
        "defaultModel": "claude-sonnet-4-20250514",
        "defaultMaxTokens": 8192
      }
    },
    {
      "id": "openai",
      "type": "OpenAIAdapter",
      "config": {
        "defaultModel": "gpt-4.1"
      }
    },
    {
      "id": "ollama",
      "type": "OllamaAdapter",
      "config": {
        "baseURL": "http://localhost:11434",
        "defaultModel": "llama3.1:8b"
      }
    },
    {
      "id": "responder",
      "type": "ACPResponder"
    }
  ],
  "connections": [
    { "from": "receiver:out", "to": "selector:in" },
    { "from": "selector:anthropic", "to": "anthropic:in" },
    { "from": "selector:openai", "to": "openai:in" },
    { "from": "selector:ollama", "to": "ollama:in" },
    { "from": "anthropic:out", "to": "responder:in" },
    { "from": "openai:out", "to": "responder:in" },
    { "from": "ollama:out", "to": "responder:in" }
  ]
}
```

---

## go.mod

```go
module github.com/acphast/acphast

go 1.23

require (
    github.com/anthropics/anthropic-sdk-go v0.2.0
    github.com/openai/openai-go v0.1.0
)
```

---

## Build & Run

```bash
# Build
go build -o acphast ./cmd/acphast

# Run with default graph
./acphast

# Run with custom graph
./acphast -graph ./graphs/multi-backend.json

# Environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

---

## Comparison: Go vs TypeScript

| Aspect | Go (this) | TypeScript (Rete.js) |
|--------|-----------|----------------------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Visual Editor | ❌ (use JSON config) | ✅ Native |
| Streaming | Channels, goroutines | Async iterators |
| Type Safety | Compile-time | Runtime + TS |
| Deployment | Single binary | Node.js runtime |
| Memory | Low | Higher |

---

## Hybrid Architecture

For best of both worlds:

```
┌─────────────────────┐       JSON Graph       ┌─────────────────────┐
│   Rete.js Editor    │ ◄───────────────────►  │   Go Backend        │
│   (Browser)         │      (export/import)   │   (acphast)          │
└─────────────────────┘                        └─────────────────────┘
         │                                              │
         │ Design graphs visually                       │ Execute at scale
         │                                              │
         ▼                                              ▼
   graphs/custom.json ─────────────────────────► Runtime processing
```

1. Design graphs in Rete.js visual editor
2. Export as JSON
3. Go backend loads and executes
4. Hot-reload graph changes without restart
