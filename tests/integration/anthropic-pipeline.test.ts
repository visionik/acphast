/**
 * Anthropic Pipeline Integration Tests
 * Tests the full translator -> client -> normalizer pipeline with a mock API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { firstValueFrom, of, toArray } from 'rxjs';
import { AnthropicTranslatorNode } from '../../packages/nodes/src/anthropic/translator.js';
import { ResponseNormalizerNode } from '../../packages/nodes/src/anthropic/normalizer.js';
import { NodeRegistry } from '../../packages/nodes/src/registry.js';
import { AcphastEngine } from '../../packages/engine/src/engine.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

describe('Anthropic Pipeline Integration', () => {
  let registry: NodeRegistry;
  let engine: AcphastEngine;

  beforeAll(() => {
    registry = new NodeRegistry();
    registry.register(AnthropicTranslatorNode as any);
    registry.register(ResponseNormalizerNode as any);
  });

  beforeEach(async () => {
    engine = new AcphastEngine({ registry });
  });

  describe('translator -> normalizer pipeline', () => {
    it('should translate and normalize a simple request', async () => {
      // Load a simple 2-node graph (translator -> normalizer)
      // Skip the client node for unit-style integration testing
      const graph = {
        version: '1.0.0',
        nodes: [
          {
            id: 'translator',
            type: 'Anthropic Translator',
            config: {
              defaultModel: 'claude-3-haiku',
              defaultMaxTokens: 1024,
            },
          },
          {
            id: 'normalizer',
            type: 'Response Normalizer',
            config: {},
          },
        ],
        connections: [
          {
            source: 'translator',
            sourceOutput: 'out',
            target: 'normalizer',
            targetInput: 'in',
          },
        ],
      };

      await engine.loadGraph(graph);

      // Create input message
      const message: PipelineMessage = {
        ctx: { requestId: 'test-1', startTime: Date.now(), meta: {} } as PipelineContext,
        request: {
          id: '1',
          method: 'acp/messages/create',
          params: {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{ role: 'user', content: 'Hello, Claude!' }],
          },
        } as any,
      };

      // Execute pipeline (through translator only since normalizer needs response)
      const result$ = await engine.execute('translator', message, message.ctx);
      const results = await firstValueFrom(result$.pipe(toArray()));

      // Should have one output
      expect(results).toHaveLength(1);
      
      // Should have translated the request
      const output = results[0];
      expect(output.translated).toBeDefined();
      expect(output.translated.model).toBe('claude-sonnet-4-20250514');
      expect(output.translated.max_tokens).toBe(2048);
      expect(output.translated.stream).toBe(true);
      expect(output.backend).toBe('anthropic');
    });

    it('should use default values when not specified', async () => {
      const graph = {
        version: '1.0.0',
        nodes: [
          {
            id: 'translator',
            type: 'Anthropic Translator',
            config: {
              defaultModel: 'claude-3-haiku',
              defaultMaxTokens: 512,
              defaultTemperature: 0.5,
            },
          },
        ],
        connections: [],
      };

      await engine.loadGraph(graph);

      const message: PipelineMessage = {
        ctx: { requestId: 'test-2', startTime: Date.now(), meta: {} } as PipelineContext,
        request: {
          id: '2',
          method: 'acp/messages/create',
          params: {
            // No model, max_tokens, or temperature specified
            messages: [{ role: 'user', content: 'Test' }],
          },
        } as any,
      };

      const result$ = await engine.execute('translator', message, message.ctx);
      const results = await firstValueFrom(result$.pipe(toArray()));

      const output = results[0];
      expect(output.translated.model).toBe('claude-3-haiku');
      expect(output.translated.max_tokens).toBe(512);
      expect(output.translated.temperature).toBe(0.5);
    });

    it('should preserve Anthropic-specific metadata', async () => {
      const graph = {
        version: '1.0.0',
        nodes: [
          { id: 'translator', type: 'Anthropic Translator', config: {} },
        ],
        connections: [],
      };

      await engine.loadGraph(graph);

      const message: PipelineMessage = {
        ctx: { requestId: 'test-3', startTime: Date.now(), meta: {} } as PipelineContext,
        request: {
          id: '3',
          method: 'acp/messages/create',
          params: {
            model: 'claude-sonnet-4-20250514',
            messages: [{ role: 'user', content: 'Test' }],
            _meta: {
              anthropic: {
                stop_sequences: ['END'],
                top_p: 0.9,
                top_k: 50,
              },
            },
          },
        } as any,
      };

      const result$ = await engine.execute('translator', message, message.ctx);
      const results = await firstValueFrom(result$.pipe(toArray()));

      const output = results[0];
      expect(output.translated.stop_sequences).toEqual(['END']);
      expect(output.translated.top_p).toBe(0.9);
      expect(output.translated.top_k).toBe(50);
    });
  });

  describe('normalizer', () => {
    it('should normalize a raw Anthropic response', async () => {
      const graph = {
        version: '1.0.0',
        nodes: [
          { id: 'normalizer', type: 'Response Normalizer', config: {} },
        ],
        connections: [],
      };

      await engine.loadGraph(graph);

      // Simulate a message that already went through the client
      const message: PipelineMessage = {
        ctx: { requestId: 'test-4', startTime: Date.now(), meta: {} } as PipelineContext,
        request: { id: '4', method: 'acp/messages/create', params: {} } as any,
        backend: 'anthropic',
        response: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello! How can I help you?' }],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 10 },
        },
      };

      const result$ = await engine.execute('normalizer', message, message.ctx);
      const results = await firstValueFrom(result$.pipe(toArray()));

      const output = results[0];
      expect(output.response.content).toHaveLength(1);
      expect(output.response.content[0].text).toBe('Hello! How can I help you?');
      expect(output.response.stop_reason).toBe('end_turn');
      expect(output.response.usage.input_tokens).toBe(15);
      expect(output.response.backend).toBe('anthropic');
    });
  });
});
