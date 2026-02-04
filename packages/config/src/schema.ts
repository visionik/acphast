/**
 * TOML Configuration Schema
 */

import { z } from 'zod';

/**
 * Proxy configuration
 */
const ProxyConfigSchema = z.object({
  version: z.string().default('0.1.0'),
  defaultBackend: z.string().default('anthropic'),
});

/**
 * Anthropic backend configuration
 */
const AnthropicBackendSchema = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  defaultModel: z.string().default('claude-sonnet-4-20250514'),
  defaultMaxTokens: z.number().optional(),
  maxRetries: z.number().default(3),
  timeoutMs: z.number().default(120000),
  defaults: z
    .object({
      thinking: z.enum(['disabled', 'enabled', 'streaming']).optional(),
      maxThinkingTokens: z.number().optional(),
    })
    .optional(),
});

/**
 * OpenAI backend configuration
 */
const OpenAIBackendSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  defaultModel: z.string().default('gpt-4.1'),
  maxRetries: z.number().default(3),
  timeoutMs: z.number().default(120000),
  defaults: z
    .object({
      reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    })
    .optional(),
});

/**
 * Ollama backend configuration
 */
const OllamaBackendSchema = z.object({
  enabled: z.boolean().default(false),
  baseURL: z.string().default('http://localhost:11434'),
  defaultModel: z.string().default('llama3.1:8b'),
  timeoutMs: z.number().default(120000),
  defaults: z
    .object({
      contextLength: z.number().optional(),
    })
    .optional(),
});

/**
 * ACP backend configuration
 */
const ACPBackendSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string(),
  type: z.enum(['stdio', 'http', 'websocket']).default('stdio'),
});

/**
 * Backends configuration
 */
const BackendsConfigSchema = z.object({
  anthropic: AnthropicBackendSchema.optional(),
  openai: OpenAIBackendSchema.optional(),
  ollama: OllamaBackendSchema.optional(),
  acp: ACPBackendSchema.optional(),
});

/**
 * Server configuration
 */
const ServerConfigSchema = z.object({
  port: z.number().default(6809),
  host: z.string().default('localhost'),
});

/**
 * Graph configuration
 */
const GraphConfigSchema = z.object({
  defaultGraph: z.string().default('graphs/default.json'),
  graphDir: z.string().default('graphs'),
});

/**
 * Logging configuration
 */
const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  pretty: z.boolean().default(false),
});

/**
 * Sentry configuration
 */
const SentryConfigSchema = z.object({
  dsn: z.string().optional(),
  environment: z.string().default('development'),
});

/**
 * Complete configuration schema
 */
export const ConfigSchema = z.object({
  proxy: ProxyConfigSchema,
  backends: BackendsConfigSchema,
  server: ServerConfigSchema,
  graph: GraphConfigSchema,
  metadataPolicy: z.enum(['strict', 'permissive', 'strip']).default('permissive'),
  logging: LoggingConfigSchema,
  sentry: SentryConfigSchema.optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Environment variable overrides
 */
export const EnvironmentSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ACPHAST_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  ACPHAST_PORT: z.string().transform(Number).optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
