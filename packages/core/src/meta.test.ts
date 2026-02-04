import { describe, it, expect, vi } from 'vitest';
import {
  validateMetadata,
  mergeMetadata,
  extractMetadata,
  logUnknownMetadata,
  type Metadata,
} from './meta.js';

describe('validateMetadata', () => {
  it('should validate empty metadata', () => {
    const result = validateMetadata({});
    expect(result).toEqual({});
  });

  it('should validate proxy metadata', () => {
    const meta = {
      proxy: {
        version: '1.0.0',
        backend: 'anthropic',
        model: 'claude-3',
        requestId: 'req-123',
      },
    };

    const result = validateMetadata(meta);
    expect(result.proxy?.version).toBe('1.0.0');
    expect(result.proxy?.backend).toBe('anthropic');
  });

  it('should validate anthropic metadata', () => {
    const meta = {
      anthropic: {
        model: 'claude-3-opus',
        maxTokens: 4096,
        thinking: 'enabled' as const,
      },
    };

    const result = validateMetadata(meta);
    expect(result.anthropic?.model).toBe('claude-3-opus');
    expect(result.anthropic?.thinking).toBe('enabled');
  });

  it('should validate openai metadata', () => {
    const meta = {
      openai: {
        model: 'gpt-4',
        reasoning: { effort: 'high' as const },
      },
    };

    const result = validateMetadata(meta);
    expect(result.openai?.model).toBe('gpt-4');
    expect(result.openai?.reasoning?.effort).toBe('high');
  });

  it('should validate ollama metadata', () => {
    const meta = {
      ollama: {
        model: 'llama3',
        temperature: 0.7,
        topK: 40,
      },
    };

    const result = validateMetadata(meta);
    expect(result.ollama?.model).toBe('llama3');
    expect(result.ollama?.temperature).toBe(0.7);
  });

  it('should allow unknown keys in permissive mode', () => {
    const meta = {
      proxy: { version: '1.0.0' },
      unknownKey: { data: 'value' },
    };

    const result = validateMetadata(meta, 'permissive');
    expect(result.proxy?.version).toBe('1.0.0');
    expect((result as any).unknownKey).toEqual({ data: 'value' });
  });

  it('should throw on unknown keys in strict mode', () => {
    const meta = {
      proxy: { version: '1.0.0' },
      unknownKey: { data: 'value' },
    };

    expect(() => validateMetadata(meta, 'strict')).toThrow();
  });

  it('should strip unknown keys in strip mode', () => {
    const meta = {
      proxy: { version: '1.0.0' },
      unknownKey: { data: 'value' },
    };

    const result = validateMetadata(meta, 'strip');
    expect(result.proxy?.version).toBe('1.0.0');
    expect((result as any).unknownKey).toBeUndefined();
  });

  it('should validate nested usage metadata', () => {
    const meta = {
      proxy: {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      },
    };

    const result = validateMetadata(meta);
    expect(result.proxy?.usage?.inputTokens).toBe(100);
    expect(result.proxy?.usage?.totalTokens).toBe(150);
  });

  it('should validate cost metadata', () => {
    const meta = {
      proxy: {
        cost: {
          inputCost: 0.001,
          outputCost: 0.002,
          totalCost: 0.003,
          currency: 'USD',
        },
      },
    };

    const result = validateMetadata(meta);
    expect(result.proxy?.cost?.totalCost).toBe(0.003);
    expect(result.proxy?.cost?.currency).toBe('USD');
  });
});

describe('mergeMetadata', () => {
  it('should merge two empty metadata objects', () => {
    const result = mergeMetadata({}, {});
    expect(result).toEqual({
      proxy: {},
      anthropic: {},
      openai: {},
      ollama: {},
    });
  });

  it('should merge proxy metadata with right taking precedence', () => {
    const left: Metadata = {
      proxy: { version: '1.0.0', backend: 'anthropic' },
    };
    const right: Metadata = {
      proxy: { backend: 'openai', model: 'gpt-4' },
    };

    const result = mergeMetadata(left, right);
    expect(result.proxy?.version).toBe('1.0.0'); // from left
    expect(result.proxy?.backend).toBe('openai'); // from right (overwrite)
    expect(result.proxy?.model).toBe('gpt-4'); // from right (new)
  });

  it('should merge different backend metadata', () => {
    const left: Metadata = {
      anthropic: { model: 'claude-3' },
    };
    const right: Metadata = {
      openai: { model: 'gpt-4' },
    };

    const result = mergeMetadata(left, right);
    expect(result.anthropic?.model).toBe('claude-3');
    expect(result.openai?.model).toBe('gpt-4');
  });

  it('should handle undefined metadata sections', () => {
    const left: Metadata = {
      proxy: { version: '1.0.0' },
    };
    const right: Metadata = {};

    const result = mergeMetadata(left, right);
    expect(result.proxy?.version).toBe('1.0.0');
  });
});

describe('extractMetadata', () => {
  it('should extract metadata from content blocks', () => {
    const content = [
      { type: 'text', text: 'Hello', _meta: { proxy: { requestId: 'req-1' } } },
      { type: 'text', text: 'World', _meta: { anthropic: { model: 'claude-3' } } },
    ];

    const result = extractMetadata(content);
    expect(result.proxy?.requestId).toBe('req-1');
    expect(result.anthropic?.model).toBe('claude-3');
  });

  it('should return empty metadata for empty content', () => {
    const result = extractMetadata([]);
    expect(result).toEqual({});
  });

  it('should ignore items without _meta', () => {
    const content = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: 'World', _meta: { proxy: { version: '1.0.0' } } },
    ];

    const result = extractMetadata(content);
    expect(result.proxy?.version).toBe('1.0.0');
  });

  it('should ignore non-object _meta values', () => {
    const content = [
      { type: 'text', text: 'Hello', _meta: 'string' },
      { type: 'text', text: 'World', _meta: null },
    ];

    const result = extractMetadata(content);
    expect(result).toEqual({});
  });

  it('should merge metadata from multiple blocks', () => {
    // Note: extractMetadata uses Object.assign, so later blocks overwrite earlier
    const content = [
      { _meta: { proxy: { version: '1.0.0' } } },
      { _meta: { anthropic: { model: 'claude-3' } } },
    ];

    const result = extractMetadata(content);
    expect(result.proxy).toEqual({ version: '1.0.0' });
    expect(result.anthropic).toEqual({ model: 'claude-3' });
  });
});

describe('logUnknownMetadata', () => {
  it('should log unknown metadata keys', () => {
    const logger = { warn: vi.fn() };
    const metadata = {
      proxy: { version: '1.0.0' },
      unknownKey: 'value',
      anotherUnknown: { nested: 'data' },
    };

    logUnknownMetadata(metadata, logger);

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith('Unknown metadata key encountered', {
      key: 'unknownKey',
      value: 'value',
    });
    expect(logger.warn).toHaveBeenCalledWith('Unknown metadata key encountered', {
      key: 'anotherUnknown',
      value: { nested: 'data' },
    });
  });

  it('should not log known metadata keys', () => {
    const logger = { warn: vi.fn() };
    const metadata = {
      proxy: { version: '1.0.0' },
      anthropic: { model: 'claude-3' },
      openai: { model: 'gpt-4' },
      ollama: { model: 'llama3' },
    };

    logUnknownMetadata(metadata, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should handle undefined logger', () => {
    const metadata = {
      unknownKey: 'value',
    };

    // Should not throw
    expect(() => logUnknownMetadata(metadata)).not.toThrow();
  });

  it('should handle empty metadata', () => {
    const logger = { warn: vi.fn() };

    logUnknownMetadata({}, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
