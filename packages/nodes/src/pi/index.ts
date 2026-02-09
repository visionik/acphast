/**
 * @acphast/nodes - Pi Pipeline
 * 
 * Direct integration with Pi CLI's RPC API for streaming LLM interactions.
 * Provides a three-node pipeline: Translator → Client → Normalizer
 */

// Core RPC client
export { PiRpcClient } from './rpc-client.js';

// Type exports
export type {
  ThinkingLevel,
  PiRpcClientConfig,
  PiRpcCommand,
  PiRpcResponse,
  PiRpcEvent,
  PiModel,
  PiSessionStats,
  PiCompactionResult,
  PiState,
  PiAvailableModels,
} from './types.js';

// Node exports
export { PiTranslatorNode } from './translator.js';
export type { PiTranslatorConfig, PiTranslatedRequest } from './translator.js';

export { PiClientNode } from './client.js';
export type { PiClientConfig, PiRawResponse } from './client.js';

export { PiNormalizerNode } from './normalizer.js';
export type { PiNormalizerConfig } from './normalizer.js';
