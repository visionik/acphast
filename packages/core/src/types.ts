/**
 * Internal Pipeline Types for Acphast
 */

import type { ACPRequest, ACPNotification, SessionUpdate } from './acp.js';
import type { Observable } from 'rxjs';

/**
 * Pipeline context carries request metadata through the graph
 */
export interface PipelineContext {
  /** Unique request identifier */
  requestId: string;

  /** Session identifier (if applicable) */
  sessionId?: string;

  /** Request start timestamp */
  startTime: number;

  /** Proxy metadata */
  meta: Record<string, unknown>;

  /** Streaming update callback */
  onUpdate?: (update: ACPNotification) => void;

  /** Logger instance */
  logger?: Logger;

  // Tracing fields

  /** Trace ID for distributed tracing */
  traceId?: string;

  /** Current span ID */
  spanId?: string;

  /** Parent span ID */
  parentSpanId?: string;

  /** Errors that occurred during processing */
  errors?: PipelineError[];

  /** Timing data for performance tracking */
  timing?: TimingData;
}

/**
 * Pipeline error with context preservation
 */
export interface PipelineError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Node that produced the error */
  nodeId?: string;

  /** Node type */
  nodeType?: string;

  /** Timestamp when error occurred */
  timestamp: number;

  /** Whether the error is recoverable */
  recoverable: boolean;

  /** Original error stack */
  stack?: string;

  /** Additional error context */
  context?: Record<string, unknown>;

  /** Cause error (for error chaining) */
  cause?: PipelineError;
}

/**
 * Timing data for performance tracking
 */
export interface TimingData {
  /** Node timing entries */
  nodes: Record<string, NodeTiming>;

  /** Total processing time */
  totalMs?: number;

  /** Queue wait time */
  queueMs?: number;

  /** Backend request time */
  backendMs?: number;
}

/**
 * Timing for a single node
 */
export interface NodeTiming {
  /** Node ID */
  nodeId: string;

  /** Start time */
  startTime: number;

  /** End time */
  endTime?: number;

  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Pipeline message flowing through the graph
 */
export interface PipelineMessage {
  /** Request context */
  ctx: PipelineContext;

  /** Original ACP request */
  request: ACPRequest;

  /** Selected backend */
  backend?: string;

  /** Backend-specific translated request */
  translated?: unknown;

  /** Backend response */
  response?: unknown;

  /** Observable stream of updates */
  stream?: Observable<SessionUpdate>;
}

/**
 * Backend capabilities
 */
export interface BackendCapabilities {
  /** Backend identifier */
  id: string;

  /** Backend display name */
  name: string;

  /** Available models */
  models: string[];

  /** Supported features */
  features: {
    thinking?: boolean;
    caching?: boolean;
    vision?: boolean;
    audio?: boolean;
    tools?: boolean;
    streaming?: boolean;
    reasoning?: boolean;
  };

  /** Backend limits */
  limits: {
    maxContextTokens?: number;
    maxOutputTokens?: number;
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Session data
 */
export interface Session {
  /** Session identifier */
  id: string;

  /** Working directory */
  cwd?: string;

  /** MCP servers */
  mcpServers?: unknown[];

  /** Conversation history */
  history: HistoryEntry[];

  /** Session metadata */
  metadata: Record<string, unknown>;

  /** Created timestamp */
  createdAt: number;

  /** Last accessed timestamp */
  lastAccessedAt: number;
}

/**
 * History entry in a session
 */
export interface HistoryEntry {
  /** Request ID */
  requestId: string;

  /** Timestamp */
  timestamp: number;

  /** User prompt */
  prompt: unknown[];

  /** Assistant response */
  response?: unknown;

  /** Stop reason */
  stopReason?: string;

  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Metadata validation policy
 */
export type MetadataPolicy = 'strict' | 'permissive' | 'strip';

/**
 * Configuration structure (used by config package)
 */
export interface AcphastConfig {
  /** Proxy version */
  version: string;

  /** Default backend */
  defaultBackend: string;

  /** Backend configurations */
  backends: {
    anthropic?: AnthropicBackendConfig;
    openai?: OpenAIBackendConfig;
    ollama?: OllamaBackendConfig;
    acp?: ACPBackendConfig;
  };

  /** Server configuration */
  server: {
    port: number;
    host?: string;
  };

  /** Graph configuration */
  graph: {
    defaultGraph?: string;
    graphDir?: string;
  };

  /** Metadata validation policy */
  metadataPolicy: MetadataPolicy;

  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    pretty?: boolean;
  };

  /** Sentry configuration */
  sentry?: {
    dsn?: string;
    environment?: string;
  };
}

/**
 * Backend configurations
 */
export interface AnthropicBackendConfig {
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  defaultMaxTokens?: number;
  maxRetries?: number;
  timeoutMs?: number;
  defaults?: {
    thinking?: 'disabled' | 'enabled' | 'streaming';
    maxThinkingTokens?: number;
  };
}

export interface OpenAIBackendConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  defaultModel: string;
  maxRetries?: number;
  timeoutMs?: number;
  defaults?: {
    reasoningEffort?: 'low' | 'medium' | 'high';
  };
}

export interface OllamaBackendConfig {
  enabled: boolean;
  baseURL: string;
  defaultModel: string;
  timeoutMs?: number;
  defaults?: {
    contextLength?: number;
  };
}

export interface ACPBackendConfig {
  enabled: boolean;
  endpoint: string;
  type: 'stdio' | 'http' | 'websocket';
}
