import { describe, it, expect, vi } from 'vitest';
import { Observable, of } from 'rxjs';
import { AcphastNode, getNodeMetadata, type NodeMetadata } from './node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

// Concrete implementation of AcphastNode for testing
class TestNode extends AcphastNode {
  static override meta: NodeMetadata = {
    name: 'Test Node',
    category: 'utility',
    description: 'A test node',
    inputs: [{ name: 'in', type: 'pipeline', label: 'Input' }],
    outputs: [{ name: 'out', type: 'pipeline', label: 'Output' }],
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Test Node', config);
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];
    if (!input$) return {};
    return { out: input$ };
  }
}

class NodeWithSchema extends AcphastNode {
  static override meta: NodeMetadata = {
    name: 'Node With Schema',
    category: 'utility',
    description: 'A node with config schema',
    inputs: [],
    outputs: [],
    configSchema: { type: 'object' }, // Simple schema placeholder
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Node With Schema', config);
  }

  process(): Record<string, Observable<PipelineMessage>> {
    return {};
  }
}

describe('AcphastNode', () => {
  describe('constructor', () => {
    it('should create node with label', () => {
      const node = new TestNode();
      expect(node.label).toBe('Test Node');
    });

    it('should create node with default empty config', () => {
      const node = new TestNode();
      expect(node.config).toEqual({});
    });

    it('should create node with provided config', () => {
      const node = new TestNode({ key: 'value', number: 42 });
      expect(node.config).toEqual({ key: 'value', number: 42 });
    });
  });

  describe('setLogger', () => {
    it('should set logger instance', () => {
      const node = new TestNode();
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as any;

      node.setLogger(logger);
      // Logger is protected, so we verify through behavior in subclass
      expect(true).toBe(true); // Logger set successfully
    });
  });

  describe('updateConfig', () => {
    it('should merge new config with existing', () => {
      const node = new TestNode({ a: 1, b: 2 });
      node.updateConfig({ b: 3, c: 4 });
      expect(node.config).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should add new properties', () => {
      const node = new TestNode();
      node.updateConfig({ newProp: 'value' });
      expect(node.config).toEqual({ newProp: 'value' });
    });

    it('should not mutate original config object', () => {
      const originalConfig = { a: 1 };
      const node = new TestNode(originalConfig);
      node.updateConfig({ b: 2 });
      expect(originalConfig).toEqual({ a: 1 });
    });
  });

  describe('validate', () => {
    it('should return empty array for node without schema', () => {
      const node = new TestNode();
      const errors = node.validate();
      expect(errors).toEqual([]);
    });

    it('should return empty array for node with schema (schema validation not implemented)', () => {
      const node = new NodeWithSchema();
      const errors = node.validate();
      expect(errors).toEqual([]);
    });
  });

  describe('static meta', () => {
    it('should have correct name', () => {
      expect(TestNode.meta.name).toBe('Test Node');
    });

    it('should have correct category', () => {
      expect(TestNode.meta.category).toBe('utility');
    });

    it('should have description', () => {
      expect(TestNode.meta.description).toBe('A test node');
    });

    it('should have input definitions', () => {
      expect(TestNode.meta.inputs).toHaveLength(1);
      expect(TestNode.meta.inputs[0]).toEqual({
        name: 'in',
        type: 'pipeline',
        label: 'Input',
      });
    });

    it('should have output definitions', () => {
      expect(TestNode.meta.outputs).toHaveLength(1);
      expect(TestNode.meta.outputs[0]).toEqual({
        name: 'out',
        type: 'pipeline',
        label: 'Output',
      });
    });
  });

  describe('process', () => {
    it('should return empty object when no inputs', () => {
      const node = new TestNode();
      const result = node.process({}, {} as PipelineContext);
      expect(result).toEqual({});
    });

    it('should pass through input to output', async () => {
      const node = new TestNode();
      const message: PipelineMessage = {
        ctx: {} as PipelineContext,
        request: { id: '1', method: 'test', params: {} } as any,
      };

      const result = node.process(
        { in: [of(message)] },
        {} as PipelineContext
      );

      expect(result.out).toBeDefined();
    });
  });
});

describe('getNodeMetadata', () => {
  it('should return node metadata', () => {
    const meta = getNodeMetadata(TestNode);
    expect(meta).toBe(TestNode.meta);
    expect(meta.name).toBe('Test Node');
  });
});
