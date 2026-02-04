/**
 * Metadata Schemas for Provider-Specific Extensions
 * Uses Zod for runtime validation
 */

import { z } from 'zod';
import type { MetadataPolicy } from './types.js';

/**
 * Proxy metadata schema
 */
export const ProxyMetaSchema = z.object({
  version: z.string().optional(),
  backend: z.string().optional(),
  model: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  startTime: z.number().optional(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
      thinkingTokens: z.number().optional(),
    })
    .optional(),
  cost: z
    .object({
      inputCost: z.number().optional(),
      outputCost: z.number().optional(),
      totalCost: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  timing: z
    .object({
      queuedMs: z.number().optional(),
      processingMs: z.number().optional(),
      totalMs: z.number().optional(),
    })
    .optional(),
  retryAfterMs: z.number().optional(),
});

/**
 * Anthropic metadata schema
 */
export const AnthropicMetaSchema = z.object({
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  thinking: z.enum(['disabled', 'enabled', 'streaming']).optional(),
  maxThinkingTokens: z.number().optional(),
  thinkingBlockId: z.string().optional(),
  thinkingBlockIndex: z.number().optional(),
  cacheControl: z
    .object({
      type: z.literal('ephemeral'),
      ttl: z.number().optional(),
    })
    .optional(),
  cacheReadInputTokens: z.number().optional(),
  cacheCreationInputTokens: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
  interleaved_thinking: z.boolean().optional(),
  stopReason: z.string().optional(),
  stopSequence: z.string().nullable().optional(),
});

/**
 * OpenAI metadata schema
 */
export const OpenAIMetaSchema = z.object({
  model: z.string().optional(),
  reasoning: z
    .object({
      effort: z.enum(['low', 'medium', 'high']),
      summary: z.enum(['disabled', 'auto', 'always']).optional(),
    })
    .optional(),
  reasoningTokens: z.number().optional(),
  reasoningSummary: z.boolean().optional(),
  builtinTools: z
    .array(
      z.object({
        type: z.enum(['web_search', 'code_interpreter', 'file_search']),
        config: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  builtinTool: z.boolean().optional(),
  serverExecuted: z.boolean().optional(),
  fileIds: z.array(z.string()).optional(),
  vectorStoreIds: z.array(z.string()).optional(),
  responseFormat: z
    .object({
      type: z.enum(['text', 'json_object', 'json_schema']),
      schema: z.record(z.unknown()).optional(),
    })
    .optional(),
  prediction: z
    .object({
      type: z.literal('content'),
      content: z.string(),
    })
    .optional(),
});

/**
 * Ollama metadata schema
 */
export const OllamaMetaSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  repeatPenalty: z.number().optional(),
  contextLength: z.number().optional(),
  numPredict: z.number().optional(),
  numGpu: z.number().optional(),
  mainGpu: z.number().optional(),
  keepAlive: z.string().optional(),
});

/**
 * Complete metadata schema
 */
export const MetadataSchema = z.object({
  proxy: ProxyMetaSchema.optional(),
  anthropic: AnthropicMetaSchema.optional(),
  openai: OpenAIMetaSchema.optional(),
  ollama: OllamaMetaSchema.optional(),
});

export type ProxyMeta = z.infer<typeof ProxyMetaSchema>;
export type AnthropicMeta = z.infer<typeof AnthropicMetaSchema>;
export type OpenAIMeta = z.infer<typeof OpenAIMetaSchema>;
export type OllamaMeta = z.infer<typeof OllamaMetaSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Validate metadata according to policy
 */
export function validateMetadata(
  metadata: unknown,
  policy: MetadataPolicy = 'permissive'
): Metadata {
  const schema =
    policy === 'strict'
      ? MetadataSchema.strict()
      : policy === 'strip'
        ? MetadataSchema.strip()
        : MetadataSchema.passthrough();

  return schema.parse(metadata) as Metadata;
}

/**
 * Merge metadata objects, with right taking precedence
 */
export function mergeMetadata(left: Metadata, right: Metadata): Metadata {
  return {
    proxy: { ...left.proxy, ...right.proxy },
    anthropic: { ...left.anthropic, ...right.anthropic },
    openai: { ...left.openai, ...right.openai },
    ollama: { ...left.ollama, ...right.ollama },
  };
}

/**
 * Extract metadata from nested content blocks
 */
export function extractMetadata(content: unknown[]): Metadata {
  const result: Metadata = {};

  for (const item of content) {
    if (typeof item === 'object' && item !== null && '_meta' in item) {
      const itemMeta = (item as { _meta?: unknown })._meta;
      if (itemMeta && typeof itemMeta === 'object') {
        Object.assign(result, itemMeta);
      }
    }
  }

  return result;
}

/**
 * Log unknown metadata keys (for permissive mode)
 */
export function logUnknownMetadata(
  metadata: Record<string, unknown>,
  logger?: { warn: (msg: string, meta?: Record<string, unknown>) => void }
): void {
  const knownKeys = new Set(['proxy', 'anthropic', 'openai', 'ollama']);

  for (const key of Object.keys(metadata)) {
    if (!knownKeys.has(key)) {
      logger?.warn('Unknown metadata key encountered', { key, value: metadata[key] });
    }
  }
}
