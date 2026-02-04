import { describe, it, expect, beforeEach } from 'vitest';
import { NodeRegistry } from './registry.js';
import { AcphastNode } from './base/node.js';
import { Observable, of } from 'rxjs';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

// Mock node class for testing
class MockNode extends AcphastNode {
  static override meta = {
    name: 'Mock Node',
    category: 'utility' as const,
    description: 'A mock node for testing',
    inputs: [],
    outputs: [],
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Mock Node', config);
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    return { out: inputs.in?.[0] || of() };
  }
}

class AnotherMockNode extends AcphastNode {
  static override meta = {
    name: 'Another Mock Node',
    category: 'transform' as const,
    description: 'Another mock node',
    inputs: [],
    outputs: [],
  };

  constructor(config: Record<string, unknown> = {}) {
    super('Another Mock Node', config);
  }

  process(): Record<string, Observable<PipelineMessage>> {
    return {};
  }
}

// Node without meta (invalid)
class InvalidNode {
  constructor() {}
}

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('register', () => {
    it('should register a valid node class', () => {
      registry.register(MockNode as any);
      expect(registry.has('Mock Node')).toBe(true);
    });

    it('should throw when registering node without meta', () => {
      expect(() => registry.register(InvalidNode as any)).toThrow(
        "Node class must have static 'meta' property"
      );
    });

    it('should throw when registering duplicate node type', () => {
      registry.register(MockNode as any);
      expect(() => registry.register(MockNode as any)).toThrow(
        "Node type 'Mock Node' is already registered"
      );
    });
  });

  describe('registerMany', () => {
    it('should register multiple node classes at once', () => {
      registry.registerMany([MockNode as any, AnotherMockNode as any]);

      expect(registry.has('Mock Node')).toBe(true);
      expect(registry.has('Another Mock Node')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a node type', () => {
      registry.register(MockNode as any);
      expect(registry.has('Mock Node')).toBe(true);

      registry.unregister('Mock Node');
      expect(registry.has('Mock Node')).toBe(false);
    });

    it('should not throw when unregistering non-existent type', () => {
      expect(() => registry.unregister('Non Existent')).not.toThrow();
    });
  });

  describe('create', () => {
    it('should create a node instance', () => {
      registry.register(MockNode as any);

      const node = registry.create('Mock Node');
      expect(node).toBeInstanceOf(MockNode);
    });

    it('should create a node instance with config', () => {
      registry.register(MockNode as any);

      const node = registry.create('Mock Node', { option: 'value' });
      expect(node.config).toEqual({ option: 'value' });
    });

    it('should throw when creating unregistered node type', () => {
      expect(() => registry.create('Unknown Node')).toThrow(
        "Node type 'Unknown Node' is not registered"
      );
    });
  });

  describe('getMeta', () => {
    it('should return node metadata', () => {
      registry.register(MockNode as any);

      const meta = registry.getMeta('Mock Node');
      expect(meta.name).toBe('Mock Node');
      expect(meta.category).toBe('utility');
      expect(meta.description).toBe('A mock node for testing');
    });

    it('should throw when getting meta for unregistered type', () => {
      expect(() => registry.getMeta('Unknown Node')).toThrow(
        "Node type 'Unknown Node' is not registered"
      );
    });
  });

  describe('has', () => {
    it('should return true for registered types', () => {
      registry.register(MockNode as any);
      expect(registry.has('Mock Node')).toBe(true);
    });

    it('should return false for unregistered types', () => {
      expect(registry.has('Unknown Node')).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all registered type names', () => {
      registry.register(MockNode as any);
      registry.register(AnotherMockNode as any);

      const types = registry.list();
      expect(types).toContain('Mock Node');
      expect(types).toContain('Another Mock Node');
      expect(types).toHaveLength(2);
    });

    it('should return empty array when no nodes registered', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('listByCategory', () => {
    it('should return nodes matching category', () => {
      registry.register(MockNode as any);
      registry.register(AnotherMockNode as any);

      const utilityNodes = registry.listByCategory('utility');
      expect(utilityNodes).toContain('Mock Node');
      expect(utilityNodes).not.toContain('Another Mock Node');

      const transformNodes = registry.listByCategory('transform');
      expect(transformNodes).toContain('Another Mock Node');
      expect(transformNodes).not.toContain('Mock Node');
    });

    it('should return empty array for category with no nodes', () => {
      registry.register(MockNode as any);

      const adapters = registry.listByCategory('adapter');
      expect(adapters).toEqual([]);
    });
  });

  describe('getAllMetadata', () => {
    it('should return metadata for all registered nodes', () => {
      registry.register(MockNode as any);
      registry.register(AnotherMockNode as any);

      const allMeta = registry.getAllMetadata();
      expect(allMeta.size).toBe(2);
      expect(allMeta.get('Mock Node')?.category).toBe('utility');
      expect(allMeta.get('Another Mock Node')?.category).toBe('transform');
    });

    it('should return empty map when no nodes registered', () => {
      const allMeta = registry.getAllMetadata();
      expect(allMeta.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all registrations', () => {
      registry.register(MockNode as any);
      registry.register(AnotherMockNode as any);
      expect(registry.list()).toHaveLength(2);

      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });
  });
});
