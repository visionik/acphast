/**
 * Configuration Loader
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse as parseToml } from 'smol-toml';
import { ConfigSchema, EnvironmentSchema, type Config, type Environment } from './schema.js';

/**
 * Load configuration from TOML file
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  const path = configPath || findConfigPath();

  try {
    const content = await readFile(path, 'utf-8');
    const parsed = parseToml(content);

    // Validate and apply defaults
    const config = ConfigSchema.parse(parsed);

    // Merge environment variables
    const env = loadEnvironment();
    return mergeEnvironment(config, env);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${path}`);
    }
    throw error;
  }
}

/**
 * Find configuration file in standard locations
 */
function findConfigPath(): string {
  const locations = [
    'acphast.toml',
    '.acphast.toml',
    resolve(process.env.HOME || '~', '.config/acphast/config.toml'),
  ];

  // For now, return first location (will check existence in loadConfig)
  return locations[0];
}

/**
 * Load environment variables
 */
function loadEnvironment(): Environment {
  return EnvironmentSchema.parse(process.env);
}

/**
 * Merge environment variables into config
 */
function mergeEnvironment(config: Config, env: Environment): Config {
  const merged = { ...config };

  // API keys
  if (env.ANTHROPIC_API_KEY && merged.backends.anthropic) {
    merged.backends.anthropic.apiKey = env.ANTHROPIC_API_KEY;
  }

  if (env.OPENAI_API_KEY && merged.backends.openai) {
    merged.backends.openai.apiKey = env.OPENAI_API_KEY;
  }

  // Sentry
  if (env.SENTRY_DSN) {
    if (!merged.sentry) {
      merged.sentry = { environment: 'development' };
    }
    merged.sentry.dsn = env.SENTRY_DSN;
  }

  // Log level
  if (env.ACPHAST_LOG_LEVEL) {
    merged.logging.level = env.ACPHAST_LOG_LEVEL;
  }

  // Port
  if (env.ACPHAST_PORT) {
    merged.server.port = env.ACPHAST_PORT;
  }

  return merged;
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): Config {
  return ConfigSchema.parse(config);
}

/**
 * Generate default configuration
 */
export function generateDefaultConfig(): Config {
  return ConfigSchema.parse({
    proxy: {
      version: '0.1.0',
      defaultBackend: 'anthropic',
    },
    backends: {
      anthropic: {
        enabled: true,
        defaultModel: 'claude-sonnet-4-20250514',
        maxRetries: 3,
        timeoutMs: 120000,
      },
    },
    server: {
      port: 6809,
      host: 'localhost',
    },
    graph: {
      defaultGraph: 'graphs/default.json',
      graphDir: 'graphs',
    },
    metadataPolicy: 'permissive',
    logging: {
      level: 'info',
      pretty: false,
    },
  });
}

/**
 * Convert config to TOML string
 */
export function configToToml(config: Config): string {
  const lines: string[] = [];

  // Proxy section
  lines.push('[proxy]');
  lines.push(`version = "${config.proxy.version}"`);
  lines.push(`defaultBackend = "${config.proxy.defaultBackend}"`);
  lines.push('');

  // Backends section
  if (config.backends.anthropic) {
    lines.push('[backends.anthropic]');
    lines.push(`enabled = ${config.backends.anthropic.enabled}`);
    lines.push(`defaultModel = "${config.backends.anthropic.defaultModel}"`);
    if (config.backends.anthropic.defaultMaxTokens) {
      lines.push(`defaultMaxTokens = ${config.backends.anthropic.defaultMaxTokens}`);
    }
    lines.push(`maxRetries = ${config.backends.anthropic.maxRetries}`);
    lines.push(`timeoutMs = ${config.backends.anthropic.timeoutMs}`);
    lines.push('');
  }

  if (config.backends.openai) {
    lines.push('[backends.openai]');
    lines.push(`enabled = ${config.backends.openai.enabled}`);
    if (config.backends.openai.baseURL) {
      lines.push(`baseURL = "${config.backends.openai.baseURL}"`);
    }
    lines.push(`defaultModel = "${config.backends.openai.defaultModel}"`);
    lines.push(`maxRetries = ${config.backends.openai.maxRetries}`);
    lines.push(`timeoutMs = ${config.backends.openai.timeoutMs}`);
    lines.push('');
  }

  if (config.backends.ollama) {
    lines.push('[backends.ollama]');
    lines.push(`enabled = ${config.backends.ollama.enabled}`);
    lines.push(`baseURL = "${config.backends.ollama.baseURL}"`);
    lines.push(`defaultModel = "${config.backends.ollama.defaultModel}"`);
    lines.push(`timeoutMs = ${config.backends.ollama.timeoutMs}`);
    lines.push('');
  }

  // Server section
  lines.push('[server]');
  lines.push(`port = ${config.server.port}`);
  lines.push(`host = "${config.server.host}"`);
  lines.push('');

  // Graph section
  lines.push('[graph]');
  lines.push(`defaultGraph = "${config.graph.defaultGraph}"`);
  lines.push(`graphDir = "${config.graph.graphDir}"`);
  lines.push('');

  // Metadata policy
  lines.push(`metadataPolicy = "${config.metadataPolicy}"`);
  lines.push('');

  // Logging section
  lines.push('[logging]');
  lines.push(`level = "${config.logging.level}"`);
  lines.push(`pretty = ${config.logging.pretty}`);
  lines.push('');

  // Sentry section (optional)
  if (config.sentry) {
    lines.push('[sentry]');
    if (config.sentry.dsn) {
      lines.push(`# dsn = "your-sentry-dsn-here"  # Set via SENTRY_DSN env var`);
    }
    lines.push(`environment = "${config.sentry.environment}"`);
    lines.push('');
  }

  return lines.join('\n');
}
