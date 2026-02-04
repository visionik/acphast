import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { ResponseNormalizerNode, type ResponseNormalizerConfig } from './normalizer.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { AnthropicRawResponse } from './client.js';

describe('ResponseNormalizerNode', () => {
  const createMessage = (response: AnthropicRawResponse, backend = 'anthropic'): PipelineMessage => ({
    ctx: {} as PipelineContext,
    request: { id: 'test-id', method: 'acp/messages/create', params: {} } as any,
    response,
    backend,
  });

  describe('metadata', () => {
    it('should have correct static meta', () => {
      expect(ResponseNormalizerNode.meta.name).toBe('Response Normalizer');
      expect(ResponseNormalizerNode.meta.category).toBe('transform');
      expect(ResponseNormalizerNode.meta.inputs).toHaveLength(1);
      expect(ResponseNormalizerNode.meta.outputs).toHaveLength(1);
    });
  });

  describe('constructor', () => {
    it('should create node with default config', () => {
      const node = new ResponseNormalizerNode();
      expect(node.label).toBe('Response Normalizer');
      expect(node.config).toEqual({});
    });

    it('should create node with custom config', () => {
      const config: ResponseNormalizerConfig = {
        includeModel: true,
        includeId: false,
      };
      const node = new ResponseNormalizerNode(config);
      expect(node.config).toEqual(config);
    });
  });

  describe('process', () => {
    it('should return empty object when no input', () => {
      const node = new ResponseNormalizerNode();
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);

      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should normalize basic response', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello world' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response).toEqual({
        content: [{ type: 'text', text: 'Hello world' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
        backend: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        id: 'msg_123',
      });
    });

    it('should return message unchanged when no response', async () => {
      const node = new ResponseNormalizerNode();
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: { id: 'test', method: 'test', params: {} } as any,
      };

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output).toBe(message);
    });

    it('should handle response without usage', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.usage).toBeUndefined();
    });

    it('should handle response without content', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: undefined as any,
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.content).toEqual([]);
    });

    it('should use unknown backend when not specified', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'test',
        stop_reason: 'end_turn',
      };
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: { id: 'test', method: 'test', params: {} } as any,
        response: rawResponse,
        // backend not specified
      };

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.backend).toBe('unknown');
    });

    it('should exclude model when includeModel is false', async () => {
      const node = new ResponseNormalizerNode({ includeModel: false });
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.model).toBeUndefined();
    });

    it('should exclude id when includeId is false', async () => {
      const node = new ResponseNormalizerNode({ includeId: false });
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.id).toBeUndefined();
    });

    it('should preserve other message properties', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message: PipelineMessage = {
        ctx: { requestId: 'ctx-123' } as any,
        request: { id: 'req-123', method: 'test', params: {} } as any,
        response: rawResponse,
        backend: 'anthropic',
        translated: { some: 'data' },
      };

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.ctx).toEqual({ requestId: 'ctx-123' });
      expect(output.request).toEqual({ id: 'req-123', method: 'test', params: {} });
      expect(output.translated).toEqual({ some: 'data' });
    });

    it('should handle null stop_reason', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'streaming...' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: null,
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.stop_reason).toBeNull();
    });

    it('should handle multiple content blocks', async () => {
      const node = new ResponseNormalizerNode();
      const rawResponse: AnthropicRawResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'First' },
          { type: 'text', text: 'Second' },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
      };
      const message = createMessage(rawResponse);

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      const output = await firstValueFrom(result.out);
      expect(output.response.content).toHaveLength(2);
      expect(output.response.content[0].text).toBe('First');
      expect(output.response.content[1].text).toBe('Second');
    });
  });
});
