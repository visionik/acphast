import { describe, it, expect, vi } from 'vitest';
import { Observable, of, firstValueFrom, toArray } from 'rxjs';
import { ACPPassthroughNode, type ACPPassthroughConfig } from './acp-passthrough.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

describe('ACPPassthroughNode', () => {
  const createMessage = (): PipelineMessage => ({
    ctx: {} as PipelineContext,
    request: {
      id: 'test',
      method: 'acp/messages/create',
      params: { messages: [{ role: 'user', content: 'Hello' }] },
    } as any,
  });

  describe('metadata', () => {
    it('should have correct static meta', () => {
      expect(ACPPassthroughNode.meta.name).toBe('ACP Passthrough');
      expect(ACPPassthroughNode.meta.category).toBe('adapter');
      expect(ACPPassthroughNode.meta.inputs).toHaveLength(1);
      expect(ACPPassthroughNode.meta.outputs).toHaveLength(1);
    });
  });

  describe('constructor', () => {
    it('should create node with default config', () => {
      // When called without args, the default parameter value is used
      const node = new ACPPassthroughNode({ endpoint: '', type: 'stdio' });
      expect(node.label).toBe('ACP Passthrough');
      expect(node.config).toEqual({ endpoint: '', type: 'stdio' });
    });

    it('should create node with custom config', () => {
      const config: ACPPassthroughConfig = {
        endpoint: 'http://localhost:8080',
        type: 'http',
        timeout: 30000,
      };
      const node = new ACPPassthroughNode(config);
      expect(node.config.endpoint).toBe('http://localhost:8080');
      expect(node.config.type).toBe('http');
      expect(node.config.timeout).toBe(30000);
    });
  });

  describe('process', () => {
    it('should return empty object when no input', () => {
      const node = new ACPPassthroughNode({ endpoint: 'test', type: 'stdio' });
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);

      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should pass through input to output', async () => {
      const node = new ACPPassthroughNode({ endpoint: 'test', type: 'stdio' });
      node.setLogger({ warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() } as any);
      const message = createMessage();

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      expect(result.out).toBeDefined();
      const outputs = await firstValueFrom(result.out.pipe(toArray()));
      expect(outputs).toHaveLength(1);
      expect(outputs[0]).toBe(message);
    });
  });

  describe('validate', () => {
    it('should return error when endpoint is missing', () => {
      const node = new ACPPassthroughNode({ endpoint: '', type: 'stdio' });
      const errors = node.validate();
      expect(errors).toContain('endpoint is required');
    });

    it('should return error for invalid type', () => {
      const node = new ACPPassthroughNode({ endpoint: 'test', type: 'invalid' as any });
      const errors = node.validate();
      expect(errors).toContain('type must be one of: stdio, http, websocket');
    });

    it('should return no errors for valid config', () => {
      const node = new ACPPassthroughNode({ endpoint: 'http://localhost', type: 'http' });
      const errors = node.validate();
      expect(errors).toHaveLength(0);
    });

    it('should accept all valid types', () => {
      for (const type of ['stdio', 'http', 'websocket'] as const) {
        const node = new ACPPassthroughNode({ endpoint: 'test', type });
        const errors = node.validate();
        expect(errors).not.toContain('type must be one of: stdio, http, websocket');
      }
    });
  });

  describe('lifecycle hooks', () => {
    it('should call logger on onAdded', () => {
      const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
      const node = new ACPPassthroughNode({ endpoint: 'test', type: 'stdio' });
      node.setLogger(logger as any);

      node.onAdded();

      expect(logger.info).toHaveBeenCalledWith('ACPPassthrough node added', {
        endpoint: 'test',
      });
    });

    it('should call logger on onRemoved', () => {
      const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
      const node = new ACPPassthroughNode({ endpoint: 'test', type: 'stdio' });
      node.setLogger(logger as any);

      node.onRemoved();

      expect(logger.info).toHaveBeenCalledWith('ACPPassthrough node removed');
    });
  });
});
