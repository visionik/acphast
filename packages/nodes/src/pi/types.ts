/**
 * Pi RPC Type Definitions
 * Types for Pi CLI RPC protocol communication
 */

/**
 * Thinking levels supported by Pi
 */
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * Configuration for spawning Pi RPC client
 */
export interface PiRpcClientConfig {
  /** Working directory for pi process */
  cwd: string;

  /** Pi command override (default: 'pi') */
  piCommand?: string;

  /** Session file path for persistence */
  sessionPath?: string;
}

/**
 * Base RPC command structure
 */
export interface PiRpcCommand {
  type: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * RPC response structure
 */
export interface PiRpcResponse {
  type: 'response';
  id?: string;
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Generic event structure from Pi
 */
export type PiRpcEvent = Record<string, unknown>;

/**
 * Model specification
 */
export interface PiModel {
  provider: string;
  modelId: string;
}

/**
 * Session statistics from Pi
 */
export interface PiSessionStats {
  sessionId?: string;
  sessionFile?: string;
  totalMessages?: number;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
}

/**
 * Compaction result
 */
export interface PiCompactionResult {
  tokensBefore?: number;
  tokensAfter?: number;
  summary?: string;
}

/**
 * Pi state information
 */
export interface PiState {
  sessionFile?: string;
  model?: PiModel;
  thinkingLevel?: ThinkingLevel;
  [key: string]: unknown;
}

/**
 * Available models response
 */
export interface PiAvailableModels {
  models: PiModel[];
}
