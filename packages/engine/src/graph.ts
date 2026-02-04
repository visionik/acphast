/**
 * Graph Serialization
 * Types and functions for loading/saving graphs as JSON
 */

/**
 * Serialized node definition
 */
export interface SerializedNode {
  /** Unique node ID */
  id: string;

  /** Node type name (from registry) */
  type: string;

  /** Node configuration */
  config?: Record<string, unknown>;

  /** Position in visual editor (optional) */
  position?: {
    x: number;
    y: number;
  };

  /** Display label (optional) */
  label?: string;
}

/**
 * Serialized connection between nodes
 */
export interface SerializedConnection {
  /** Connection ID (optional) */
  id?: string;

  /** Source node ID */
  source: string;

  /** Source output port */
  sourceOutput: string;

  /** Target node ID */
  target: string;

  /** Target input port */
  targetInput: string;
}

/**
 * Complete serialized graph
 */
export interface SerializedGraph {
  /** Graph version for compatibility */
  version: string;

  /** Graph metadata */
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    created?: string;
    modified?: string;
  };

  /** Node definitions */
  nodes: SerializedNode[];

  /** Connections between nodes */
  connections: SerializedConnection[];
}

/**
 * Validate a serialized graph
 */
export function validateGraph(graph: unknown): SerializedGraph {
  if (!graph || typeof graph !== 'object') {
    throw new Error('Graph must be an object');
  }

  const g = graph as Partial<SerializedGraph>;

  if (!g.version) {
    throw new Error('Graph must have a version');
  }

  if (!Array.isArray(g.nodes)) {
    throw new Error('Graph must have a nodes array');
  }

  if (!Array.isArray(g.connections)) {
    throw new Error('Graph must have a connections array');
  }

  // Validate nodes
  for (const node of g.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      throw new Error('Each node must have a string id');
    }
    if (!node.type || typeof node.type !== 'string') {
      throw new Error('Each node must have a string type');
    }
  }

  // Validate connections
  for (const conn of g.connections) {
    if (!conn.source || !conn.sourceOutput || !conn.target || !conn.targetInput) {
      throw new Error('Each connection must have source, sourceOutput, target, targetInput');
    }
  }

  // Check that connections reference existing nodes
  const nodeIds = new Set(g.nodes.map((n) => n.id));
  for (const conn of g.connections) {
    if (!nodeIds.has(conn.source)) {
      throw new Error(`Connection references unknown source node: ${conn.source}`);
    }
    if (!nodeIds.has(conn.target)) {
      throw new Error(`Connection references unknown target node: ${conn.target}`);
    }
  }

  return g as SerializedGraph;
}

/**
 * Create an empty graph
 */
export function createEmptyGraph(): SerializedGraph {
  return {
    version: '1.0.0',
    metadata: {
      created: new Date().toISOString(),
    },
    nodes: [],
    connections: [],
  };
}
