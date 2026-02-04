import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig, generateDefaultConfig, configToToml, loadConfig } from './loader.js';
import { readFile } from 'fs/promises';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('validateConfig', () => {
  it('should validate a minimal config', () => {
    const config = {
      proxy: { version: '1.0.0', defaultBackend: 'anthropic' },
      backends: {},
      server: { port: 8080, host: 'localhost' },
      graph: { defaultGraph: 'graph.json', graphDir: 'graphs' },
      metadataPolicy: 'permissive',
      logging: { level: 'info', pretty: false },
    };

    const result = validateConfig(config);
    expect(result.proxy.version).toBe('1.0.0');
  });

  it('should apply defaults for missing fields', () => {
    const config = {
      proxy: {},
      backends: {},
      server: {},
      graph: {},
      logging: {},
    };

    const result = validateConfig(config);
    expect(result.proxy.version).toBe('0.1.0');
    expect(result.proxy.defaultBackend).toBe('anthropic');
    expect(result.server.port).toBe(6809);
    expect(result.server.host).toBe('localhost');
    expect(result.graph.defaultGraph).toBe('graphs/default.json');
    expect(result.logging.level).toBe('info');
    expect(result.metadataPolicy).toBe('permissive');
  });

  it('should validate anthropic backend config', () => {
    const config = {
      proxy: {},
      backends: {
        anthropic: {
          enabled: true,
          apiKey: 'sk-test',
          defaultModel: 'claude-3-opus',
          maxRetries: 5,
          timeoutMs: 60000,
        },
      },
      server: {},
      graph: {},
      logging: {},
    };

    const result = validateConfig(config);
    expect(result.backends.anthropic?.enabled).toBe(true);
    expect(result.backends.anthropic?.apiKey).toBe('sk-test');
    expect(result.backends.anthropic?.maxRetries).toBe(5);
  });

  it('should validate openai backend config', () => {
    const config = {
      proxy: {},
      backends: {
        openai: {
          enabled: true,
          baseURL: 'https://custom.openai.com',
          defaultModel: 'gpt-4',
        },
      },
      server: {},
      graph: {},
      logging: {},
    };

    const result = validateConfig(config);
    expect(result.backends.openai?.enabled).toBe(true);
    expect(result.backends.openai?.baseURL).toBe('https://custom.openai.com');
  });

  it('should validate ollama backend config', () => {
    const config = {
      proxy: {},
      backends: {
        ollama: {
          enabled: true,
          baseURL: 'http://localhost:11434',
          defaultModel: 'llama3',
        },
      },
      server: {},
      graph: {},
      logging: {},
    };

    const result = validateConfig(config);
    expect(result.backends.ollama?.enabled).toBe(true);
    expect(result.backends.ollama?.baseURL).toBe('http://localhost:11434');
  });

  it('should validate sentry config', () => {
    const config = {
      proxy: {},
      backends: {},
      server: {},
      graph: {},
      logging: {},
      sentry: {
        dsn: 'https://sentry.io/123',
        environment: 'production',
      },
    };

    const result = validateConfig(config);
    expect(result.sentry?.dsn).toBe('https://sentry.io/123');
    expect(result.sentry?.environment).toBe('production');
  });

  it('should reject invalid metadata policy', () => {
    const config = {
      proxy: {},
      backends: {},
      server: {},
      graph: {},
      logging: {},
      metadataPolicy: 'invalid',
    };

    expect(() => validateConfig(config)).toThrow();
  });

  it('should reject invalid log level', () => {
    const config = {
      proxy: {},
      backends: {},
      server: {},
      graph: {},
      logging: { level: 'verbose' },
    };

    expect(() => validateConfig(config)).toThrow();
  });
});

describe('generateDefaultConfig', () => {
  it('should generate a valid default config', () => {
    const config = generateDefaultConfig();

    expect(config.proxy.version).toBe('0.1.0');
    expect(config.proxy.defaultBackend).toBe('anthropic');
    expect(config.backends.anthropic?.enabled).toBe(true);
    expect(config.backends.anthropic?.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(config.server.port).toBe(6809);
    expect(config.server.host).toBe('localhost');
    expect(config.graph.defaultGraph).toBe('graphs/default.json');
    expect(config.metadataPolicy).toBe('permissive');
    expect(config.logging.level).toBe('info');
    expect(config.logging.pretty).toBe(false);
  });

  it('should generate a config that passes validation', () => {
    const config = generateDefaultConfig();
    const validated = validateConfig(config);
    expect(validated).toEqual(config);
  });
});

describe('loadConfig', () => {
  const validToml = `
[proxy]
version = "1.0.0"
defaultBackend = "anthropic"

[backends.anthropic]
enabled = true
defaultModel = "claude-3"
maxRetries = 3
timeoutMs = 120000

[server]
port = 8080
host = "localhost"

[graph]
defaultGraph = "default.json"
graphDir = "graphs"

metadataPolicy = "permissive"

[logging]
level = "info"
pretty = false
`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load config from TOML file', async () => {
    (readFile as any).mockResolvedValue(validToml);

    const config = await loadConfig('/path/to/config.toml');
    expect(config.proxy.version).toBe('1.0.0');
    expect(config.server.port).toBe(8080);
  });

  it('should throw on file not found', async () => {
    const error = new Error('ENOENT');
    (error as any).code = 'ENOENT';
    (readFile as any).mockRejectedValue(error);

    await expect(loadConfig('/missing/config.toml')).rejects.toThrow(
      'Configuration file not found: /missing/config.toml'
    );
  });

  it('should rethrow other errors', async () => {
    (readFile as any).mockRejectedValue(new Error('Permission denied'));

    await expect(loadConfig('/path/config.toml')).rejects.toThrow('Permission denied');
  });

  it('should use default path when not provided', async () => {
    (readFile as any).mockResolvedValue(validToml);

    await loadConfig();
    expect(readFile).toHaveBeenCalledWith('acphast.toml', 'utf-8');
  });
});

describe('configToToml', () => {
  it('should convert minimal config to TOML', () => {
    const config = generateDefaultConfig();
    const toml = configToToml(config);

    expect(toml).toContain('[proxy]');
    expect(toml).toContain('version = "0.1.0"');
    expect(toml).toContain('defaultBackend = "anthropic"');
    expect(toml).toContain('[backends.anthropic]');
    expect(toml).toContain('[server]');
    expect(toml).toContain('port = 6809');
    expect(toml).toContain('[graph]');
    expect(toml).toContain('[logging]');
    expect(toml).toContain('metadataPolicy = "permissive"');
  });

  it('should include anthropic defaultMaxTokens when set', () => {
    const config = generateDefaultConfig();
    config.backends.anthropic!.defaultMaxTokens = 2048;
    const toml = configToToml(config);

    expect(toml).toContain('defaultMaxTokens = 2048');
  });

  it('should include openai backend when configured', () => {
    const config = generateDefaultConfig();
    config.backends.openai = {
      enabled: true,
      defaultModel: 'gpt-4',
      maxRetries: 3,
      timeoutMs: 60000,
      baseURL: 'https://api.openai.com/v1',
    };
    const toml = configToToml(config);

    expect(toml).toContain('[backends.openai]');
    expect(toml).toContain('enabled = true');
    expect(toml).toContain('defaultModel = "gpt-4"');
    expect(toml).toContain('baseURL = "https://api.openai.com/v1"');
  });

  it('should include ollama backend when configured', () => {
    const config = generateDefaultConfig();
    config.backends.ollama = {
      enabled: true,
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama3',
      timeoutMs: 60000,
    };
    const toml = configToToml(config);

    expect(toml).toContain('[backends.ollama]');
    expect(toml).toContain('enabled = true');
    expect(toml).toContain('baseURL = "http://localhost:11434"');
    expect(toml).toContain('defaultModel = "llama3"');
  });

  it('should include sentry section when configured', () => {
    const config = generateDefaultConfig();
    config.sentry = {
      dsn: 'https://sentry.io/123',
      environment: 'production',
    };
    const toml = configToToml(config);

    expect(toml).toContain('[sentry]');
    expect(toml).toContain('environment = "production"');
  });

  it('should handle sentry with just environment', () => {
    const config = generateDefaultConfig();
    config.sentry = {
      environment: 'development',
    };
    const toml = configToToml(config);

    expect(toml).toContain('[sentry]');
    expect(toml).toContain('environment = "development"');
  });
});
