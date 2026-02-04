import { describe, it, expect } from 'vitest';
import { validateGraph, createEmptyGraph, type SerializedGraph } from './graph.js';

describe('validateGraph', () => {
  const validGraph: SerializedGraph = {
    version: '1.0.0',
    nodes: [
      { id: 'node1', type: 'TestType' },
      { id: 'node2', type: 'AnotherType' },
    ],
    connections: [
      { source: 'node1', sourceOutput: 'out', target: 'node2', targetInput: 'in' },
    ],
  };

  describe('basic validation', () => {
    it('should accept a valid graph', () => {
      const result = validateGraph(validGraph);
      expect(result).toEqual(validGraph);
    });

    it('should throw for null input', () => {
      expect(() => validateGraph(null)).toThrow('Graph must be an object');
    });

    it('should throw for undefined input', () => {
      expect(() => validateGraph(undefined)).toThrow('Graph must be an object');
    });

    it('should throw for non-object input', () => {
      expect(() => validateGraph('string')).toThrow('Graph must be an object');
      expect(() => validateGraph(123)).toThrow('Graph must be an object');
      expect(() => validateGraph(true)).toThrow('Graph must be an object');
    });
  });

  describe('version validation', () => {
    it('should throw when version is missing', () => {
      const graph = { nodes: [], connections: [] };
      expect(() => validateGraph(graph)).toThrow('Graph must have a version');
    });

    it('should throw when version is empty', () => {
      const graph = { version: '', nodes: [], connections: [] };
      expect(() => validateGraph(graph)).toThrow('Graph must have a version');
    });
  });

  describe('nodes validation', () => {
    it('should throw when nodes array is missing', () => {
      const graph = { version: '1.0.0', connections: [] };
      expect(() => validateGraph(graph)).toThrow('Graph must have a nodes array');
    });

    it('should throw when nodes is not an array', () => {
      const graph = { version: '1.0.0', nodes: {}, connections: [] };
      expect(() => validateGraph(graph)).toThrow('Graph must have a nodes array');
    });

    it('should accept empty nodes array', () => {
      const graph = { version: '1.0.0', nodes: [], connections: [] };
      const result = validateGraph(graph);
      expect(result.nodes).toEqual([]);
    });

    it('should throw when node has no id', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ type: 'TestType' }],
        connections: [],
      };
      expect(() => validateGraph(graph)).toThrow('Each node must have a string id');
    });

    it('should throw when node id is not a string', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 123, type: 'TestType' }],
        connections: [],
      };
      expect(() => validateGraph(graph)).toThrow('Each node must have a string id');
    });

    it('should throw when node has no type', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1' }],
        connections: [],
      };
      expect(() => validateGraph(graph)).toThrow('Each node must have a string type');
    });

    it('should throw when node type is not a string', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 123 }],
        connections: [],
      };
      expect(() => validateGraph(graph)).toThrow('Each node must have a string type');
    });
  });

  describe('connections validation', () => {
    it('should throw when connections array is missing', () => {
      const graph = { version: '1.0.0', nodes: [] };
      expect(() => validateGraph(graph)).toThrow('Graph must have a connections array');
    });

    it('should throw when connections is not an array', () => {
      const graph = { version: '1.0.0', nodes: [], connections: {} };
      expect(() => validateGraph(graph)).toThrow('Graph must have a connections array');
    });

    it('should accept empty connections array', () => {
      const graph = { version: '1.0.0', nodes: [], connections: [] };
      const result = validateGraph(graph);
      expect(result.connections).toEqual([]);
    });

    it('should throw when connection is missing source', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [{ sourceOutput: 'out', target: 'node1', targetInput: 'in' }],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Each connection must have source, sourceOutput, target, targetInput'
      );
    });

    it('should throw when connection is missing sourceOutput', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [{ source: 'node1', target: 'node1', targetInput: 'in' }],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Each connection must have source, sourceOutput, target, targetInput'
      );
    });

    it('should throw when connection is missing target', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [{ source: 'node1', sourceOutput: 'out', targetInput: 'in' }],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Each connection must have source, sourceOutput, target, targetInput'
      );
    });

    it('should throw when connection is missing targetInput', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [{ source: 'node1', sourceOutput: 'out', target: 'node1' }],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Each connection must have source, sourceOutput, target, targetInput'
      );
    });
  });

  describe('connection references validation', () => {
    it('should throw when connection references unknown source node', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [
          { source: 'unknown', sourceOutput: 'out', target: 'node1', targetInput: 'in' },
        ],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Connection references unknown source node: unknown'
      );
    });

    it('should throw when connection references unknown target node', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [
          { source: 'node1', sourceOutput: 'out', target: 'unknown', targetInput: 'in' },
        ],
      };
      expect(() => validateGraph(graph)).toThrow(
        'Connection references unknown target node: unknown'
      );
    });

    it('should allow self-connections', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T' }],
        connections: [
          { source: 'node1', sourceOutput: 'out', target: 'node1', targetInput: 'in' },
        ],
      };
      const result = validateGraph(graph);
      expect(result.connections).toHaveLength(1);
    });
  });

  describe('optional fields', () => {
    it('should preserve node config', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T', config: { foo: 'bar' } }],
        connections: [],
      };
      const result = validateGraph(graph);
      expect(result.nodes[0].config).toEqual({ foo: 'bar' });
    });

    it('should preserve node position', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T', position: { x: 100, y: 200 } }],
        connections: [],
      };
      const result = validateGraph(graph);
      expect(result.nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('should preserve node label', () => {
      const graph = {
        version: '1.0.0',
        nodes: [{ id: 'node1', type: 'T', label: 'My Node' }],
        connections: [],
      };
      const result = validateGraph(graph);
      expect(result.nodes[0].label).toBe('My Node');
    });

    it('should preserve connection id', () => {
      const graph = {
        version: '1.0.0',
        nodes: [
          { id: 'node1', type: 'T' },
          { id: 'node2', type: 'T' },
        ],
        connections: [
          { id: 'conn1', source: 'node1', sourceOutput: 'out', target: 'node2', targetInput: 'in' },
        ],
      };
      const result = validateGraph(graph);
      expect(result.connections[0].id).toBe('conn1');
    });

    it('should preserve metadata', () => {
      const graph = {
        version: '1.0.0',
        metadata: {
          name: 'Test Graph',
          description: 'A test graph',
          author: 'Test Author',
        },
        nodes: [],
        connections: [],
      };
      const result = validateGraph(graph);
      expect(result.metadata).toEqual({
        name: 'Test Graph',
        description: 'A test graph',
        author: 'Test Author',
      });
    });
  });
});

describe('createEmptyGraph', () => {
  it('should create a graph with version 1.0.0', () => {
    const graph = createEmptyGraph();
    expect(graph.version).toBe('1.0.0');
  });

  it('should create a graph with empty nodes array', () => {
    const graph = createEmptyGraph();
    expect(graph.nodes).toEqual([]);
  });

  it('should create a graph with empty connections array', () => {
    const graph = createEmptyGraph();
    expect(graph.connections).toEqual([]);
  });

  it('should create a graph with metadata containing created timestamp', () => {
    const before = new Date().toISOString();
    const graph = createEmptyGraph();
    const after = new Date().toISOString();

    expect(graph.metadata).toBeDefined();
    expect(graph.metadata?.created).toBeDefined();
    expect(graph.metadata!.created! >= before).toBe(true);
    expect(graph.metadata!.created! <= after).toBe(true);
  });

  it('should create a valid graph that passes validation', () => {
    const graph = createEmptyGraph();
    const validated = validateGraph(graph);
    expect(validated).toEqual(graph);
  });
});
