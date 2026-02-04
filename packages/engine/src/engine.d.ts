/**
 * Graph Execution Engine
 * Core engine for executing Rete.js graphs with RxJS observables
 */
import { Observable } from 'rxjs';
import type { PipelineMessage, PipelineContext, Logger } from '@acphast/core';
import type { AcphastNode } from '@acphast/nodes';
import { NodeRegistry } from '@acphast/nodes';
import type { SerializedGraph } from './graph.js';
/**
 * Engine configuration
 */
export interface EngineConfig {
    /** Node registry to use */
    registry: NodeRegistry;
    /** Logger instance */
    logger?: Logger;
}
/**
 * Acphast Graph Execution Engine
 *
 * Manages Rete.js editor and dataflow engine
 * Executes graphs with RxJS observables
 */
export declare class AcphastEngine {
    private editor;
    private registry;
    private logger?;
    private nodeMap;
    constructor(config: EngineConfig);
    /**
     * Load a graph from serialized JSON
     */
    loadGraph(graph: SerializedGraph | string): Promise<void>;
    /**
     * Export current graph to serialized format
     */
    exportGraph(): Promise<SerializedGraph>;
    /**
     * Execute the graph with a pipeline message
     */
    execute(entryNodeId: string, message: PipelineMessage, ctx: PipelineContext): Promise<Observable<PipelineMessage>>;
    /**
     * Clear all nodes and connections
     */
    clear(): Promise<void>;
    /**
     * Get node by ID
     */
    getNode(id: string): AcphastNode | undefined;
    /**
     * Get all nodes
     */
    getNodes(): Map<string, AcphastNode>;
    /**
     * Get graph statistics
     */
    getStats(): {
        nodeCount: number;
        connectionCount: number;
    };
    private addNode;
    private addConnection;
}
//# sourceMappingURL=engine.d.ts.map