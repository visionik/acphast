import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { AnthropicTranslatorNode, type AnthropicTranslatorConfig } from './translator.js';
import type { PipelineMessage, ACPRequest, PipelineContext } from '@acphast/core';

describe('AnthropicTranslatorNode', () => {
  const createMessage = (params: Record<string, unknown>): PipelineMessage => ({
    ctx: {} as PipelineContext,
    request: {
      id: 'test-id',
      method: 'acp/messages/create',
      params,
    } as ACPRequest,
  });

  describe('metadata', () => {
    it('should have correct static meta', () => {
      expect(AnthropicTranslatorNode.meta.name).toBe('Anthropic Translator');
      expect(AnthropicTranslatorNode.meta.category).toBe('transform');
      expect(AnthropicTranslatorNode.meta.inputs).toHaveLength(1);
      expect(AnthropicTranslatorNode.meta.outputs).toHaveLength(1);
    });
  });

  describe('constructor', () => {
    it('should create node with default config', () => {
      const node = new AnthropicTranslatorNode();
      expect(node.label).toBe('Anthropic Translator');
      expect(node.config).toEqual({});
    });

    it('should create node with custom config', () => {
      const config: AnthropicTranslatorConfig = {
        defaultModel: 'claude-3-haiku-20240307',
        defaultMaxTokens: 2048,
        defaultTemperature: 0.5,
      };
      const node = new AnthropicTranslatorNode(config);
      expect(node.config).toEqual(config);
    });
  });

  describe('process', () => {
    it('should return empty object when no input', () => {
      const node = new AnthropicTranslatorNode();
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);

      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should translate basic request', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated).toEqual({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: undefined,
        messages: [{ role: 'user', content: 'Hello' }],
        system: undefined,
        stream: true,
      });
      expect(output.backend).toBe('anthropic');
    });

    it('should use default model when not specified', async () => {
      const node = new AnthropicTranslatorNode({
        defaultModel: 'claude-3-haiku-20240307',
      });
      const message = createMessage({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.model).toBe('claude-3-haiku-20240307');
    });

    it('should use fallback model when no default', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.model).toBe('claude-sonnet-4-20250514');
    });

    it('should use default max_tokens when not specified', async () => {
      const node = new AnthropicTranslatorNode({
        defaultMaxTokens: 2048,
      });
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        messages: [],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.max_tokens).toBe(2048);
    });

    it('should use default temperature when not specified', async () => {
      const node = new AnthropicTranslatorNode({
        defaultTemperature: 0.7,
      });
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        messages: [],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.temperature).toBe(0.7);
    });

    it('should preserve system prompt', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are a helpful assistant.',
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.system).toBe('You are a helpful assistant.');
    });

    it('should extract Anthropic-specific metadata', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [],
        _meta: {
          anthropic: {
            metadata: { user_id: '123' },
            stop_sequences: ['\n\n'],
            top_p: 0.9,
            top_k: 40,
          },
        },
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.metadata).toEqual({ user_id: '123' });
      expect(output.translated.stop_sequences).toEqual(['\n\n']);
      expect(output.translated.top_p).toBe(0.9);
      expect(output.translated.top_k).toBe(40);
    });

    it('should not include Anthropic meta when not present', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.metadata).toBeUndefined();
      expect(output.translated.stop_sequences).toBeUndefined();
      expect(output.translated.top_p).toBeUndefined();
      expect(output.translated.top_k).toBeUndefined();
    });

    it('should always set stream to true', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.translated.stream).toBe(true);
    });

    it('should preserve original request in message', async () => {
      const node = new AnthropicTranslatorNode();
      const message = createMessage({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Test' }],
      });

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.request).toBe(message.request);
      expect(output.ctx).toBe(message.ctx);
    });
  });
});
