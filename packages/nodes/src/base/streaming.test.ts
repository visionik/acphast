import { describe, it, expect, vi } from 'vitest';
import { Observable, of, firstValueFrom, toArray } from 'rxjs';
import { StreamingNode } from './streaming.js';
import { ClassicPreset } from 'rete';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

const MockSocket = new ClassicPreset.Socket('pipeline');

// Concrete implementation for testing
class TestStreamingNode extends StreamingNode {
  static override meta = {
    name: 'Test Streaming',
    category: 'adapter' as const,
    description: 'Test streaming node',
    inputs: [{ name: 'in', type: 'pipeline' as const, label: 'Input', required: true }],
    outputs: [{ name: 'out', type: 'pipeline' as const, label: 'Output' }],
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Test Streaming', config);
    this.addInput('in', new ClassicPreset.Input(MockSocket, 'Input'));
    this.addOutput('out', new ClassicPreset.Output(MockSocket, 'Output'));
  }

  processStream(
    message: PipelineMessage,
    _ctx: PipelineContext
  ): Observable<PipelineMessage> {
    // Emit the message back with a 'streamed' flag
    return of({
      ...message,
      streamed: true,
    } as PipelineMessage);
  }
}

describe('StreamingNode', () => {
  const createMessage = (): PipelineMessage => ({
    ctx: {} as PipelineContext,
    request: {
      id: 'test',
      method: 'test',
      params: {},
    } as any,
  });

  describe('process', () => {
    it('should return empty object when no input', () => {
      const node = new TestStreamingNode();
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);

      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should transform input through processStream', async () => {
      const node = new TestStreamingNode();
      const message = createMessage();

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      expect(result.out).toBeDefined();
      const outputs = await firstValueFrom(result.out.pipe(toArray()));
      expect(outputs).toHaveLength(1);
      expect((outputs[0] as any).streamed).toBe(true);
    });
  });

  describe('sendUpdate helper', () => {
    it('should call onUpdate when provided', () => {
      const node = new TestStreamingNode();
      const onUpdate = vi.fn();
      const ctx: PipelineContext = {
        requestId: 'req-1',
        startTime: Date.now(),
        meta: {},
        onUpdate,
      };

      // Access protected method via any cast
      (node as any).sendUpdate(ctx, { type: 'content', text: 'Hello' });

      expect(onUpdate).toHaveBeenCalledWith({
        method: 'session/update',
        params: { type: 'content', text: 'Hello' },
      });
    });

    it('should not throw when onUpdate is not provided', () => {
      const node = new TestStreamingNode();
      const ctx: PipelineContext = {
        requestId: 'req-1',
        startTime: Date.now(),
        meta: {},
      };

      // Should not throw
      expect(() => {
        (node as any).sendUpdate(ctx, { type: 'content' });
      }).not.toThrow();
    });
  });
});
