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
export declare function validateGraph(graph: unknown): SerializedGraph;
/**
 * Create an empty graph
 */
export declare function createEmptyGraph(): SerializedGraph;
//# sourceMappingURL=graph.d.ts.map