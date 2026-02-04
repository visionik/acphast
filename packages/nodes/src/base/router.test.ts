import { describe, it, expect, vi } from 'vitest';
import { Observable, of, toArray } from 'rxjs';
import { RouterNode } from './router.js';
import { ClassicPreset } from 'rete';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

const MockSocket = new ClassicPreset.Socket('pipeline');

// Concrete implementation for testing
class TestRouterNode extends RouterNode {
  static override meta = {
    name: 'Test Router',
    category: 'routing' as const,
    description: 'Test router node',
    inputs: [{ name: 'in', type: 'pipeline' as const, label: 'Input', required: true }],
    outputs: [
      { name: 'yes', type: 'pipeline' as const, label: 'Yes' },
      { name: 'no', type: 'pipeline' as const, label: 'No' },
    ],
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Test Router', config);
    this.addInput('in', new ClassicPreset.Input(MockSocket, 'Input'));
    this.addOutput('yes', new ClassicPreset.Output(MockSocket, 'Yes'));
    this.addOutput('no', new ClassicPreset.Output(MockSocket, 'No'));
  }

  route(message: PipelineMessage, _ctx: PipelineContext): string | null {
    // Route based on a flag in the request params
    const params = message.request.params as Record<string, unknown>;
    if (params.route === 'yes') return 'yes';
    if (params.route === 'no') return 'no';
    return null; // Drop the message
  }
}

describe('RouterNode', () => {
  const createMessage = (route: string): PipelineMessage => ({
    ctx: {} as PipelineContext,
    request: {
      id: 'test',
      method: 'test',
      params: { route },
    } as any,
  });

  describe('process', () => {
    it('should return empty object when no input', () => {
      const node = new TestRouterNode();
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);

      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should create outputs for all defined output ports', () => {
      const node = new TestRouterNode();
      const message = createMessage('yes');

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      expect(result.yes).toBeDefined();
      expect(result.no).toBeDefined();
    });
  });

  describe('getMeta helper', () => {
    it('should extract nested metadata', () => {
      const node = new TestRouterNode();
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: {
          id: 'test',
          method: 'test',
          params: {
            _meta: {
              proxy: {
                backend: 'anthropic',
              },
            },
          },
        } as any,
      };

      // Access protected method via any cast
      const result = (node as any).getMeta(message, 'proxy.backend');
      expect(result).toBe('anthropic');
    });

    it('should return undefined for missing path', () => {
      const node = new TestRouterNode();
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: {
          id: 'test',
          method: 'test',
          params: {},
        } as any,
      };

      const result = (node as any).getMeta(message, 'proxy.backend');
      expect(result).toBeUndefined();
    });

    it('should return undefined for partial path', () => {
      const node = new TestRouterNode();
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: {
          id: 'test',
          method: 'test',
          params: {
            _meta: {
              proxy: {},
            },
          },
        } as any,
      };

      const result = (node as any).getMeta(message, 'proxy.backend.nested');
      expect(result).toBeUndefined();
    });
  });
});
