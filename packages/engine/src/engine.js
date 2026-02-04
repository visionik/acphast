/**
 * Graph Execution Engine
 * Core engine for executing Rete.js graphs with RxJS observables
 */
import { NodeEditor, ClassicPreset } from 'rete';
import { Observable, merge, EMPTY } from 'rxjs';
import { validateGraph } from './graph.js';
/**
 * Acphast Graph Execution Engine
 *
 * Manages Rete.js editor and dataflow engine
 * Executes graphs with RxJS observables
 */
export class AcphastEngine {
    editor;
    registry;
    logger;
    nodeMap = new Map();
    constructor(config) {
        this.registry = config.registry;
        this.logger = config.logger;
        // Create Rete editor
        this.editor = new NodeEditor();
    }
    /**
     * Load a graph from serialized JSON
     */
    async loadGraph(graph) {
        // Parse if string
        const serialized = typeof graph === 'string' ? JSON.parse(graph) : graph;
        // Validate
        const validated = validateGraph(serialized);
        // Clear existing graph
        await this.clear();
        // Create nodes
        for (const nodeData of validated.nodes) {
            await this.addNode(nodeData);
        }
        // Create connections
        for (const connData of validated.connections) {
            await this.addConnection(connData);
        }
        this.logger?.info('Graph loaded successfully', {
            nodeCount: validated.nodes.length,
            connectionCount: validated.connections.length,
        });
    }
    /**
     * Export current graph to serialized format
     */
    async exportGraph() {
        const nodes = [];
        const connections = [];
        // Export nodes
        for (const [id, node] of this.nodeMap.entries()) {
            nodes.push({
                id,
                type: node.constructor.meta.name,
                config: node.config,
                label: node.label,
            });
        }
        // Export connections
        for (const connection of this.editor.getConnections()) {
            connections.push({
                source: connection.source,
                sourceOutput: connection.sourceOutput,
                target: connection.target,
                targetInput: connection.targetInput,
            });
        }
        return {
            version: '1.0.0',
            metadata: {
                modified: new Date().toISOString(),
            },
            nodes,
            connections,
        };
    }
    /**
     * Execute the graph with a pipeline message
     */
    async execute(entryNodeId, message, ctx) {
        const entryNode = this.nodeMap.get(entryNodeId);
        if (!entryNode) {
            throw new Error(`Entry node not found: ${entryNodeId}`);
        }
        this.logger?.debug('Executing graph', {
            entryNode: entryNodeId,
            requestId: ctx.requestId,
        });
        // Create an observable from the input message
        const input$ = new Observable((subscriber) => {
            subscriber.next(message);
            subscriber.complete();
        });
        // Process through the node
        const outputs = entryNode.process({ in: [input$] }, ctx);
        // Merge all output observables
        const outputStreams = Object.values(outputs);
        if (outputStreams.length === 0) {
            return EMPTY;
        }
        return merge(...outputStreams);
    }
    /**
     * Clear all nodes and connections
     */
    async clear() {
        // Call onRemoved for all nodes
        for (const node of this.nodeMap.values()) {
            if (node.onRemoved) {
                node.onRemoved();
            }
        }
        // Clear editor
        for (const connection of this.editor.getConnections()) {
            await this.editor.removeConnection(connection.id);
        }
        for (const node of this.editor.getNodes()) {
            await this.editor.removeNode(node.id);
        }
        this.nodeMap.clear();
    }
    /**
     * Get node by ID
     */
    getNode(id) {
        return this.nodeMap.get(id);
    }
    /**
     * Get all nodes
     */
    getNodes() {
        return new Map(this.nodeMap);
    }
    /**
     * Get graph statistics
     */
    getStats() {
        return {
            nodeCount: this.nodeMap.size,
            connectionCount: this.editor.getConnections().length,
        };
    }
    // Private methods
    async addNode(nodeData) {
        // Create node instance from registry
        const node = this.registry.create(nodeData.type, nodeData.config);
        // Set logger
        if (this.logger) {
            node.setLogger(this.logger.child({ nodeId: nodeData.id, nodeType: nodeData.type }));
        }
        // Override ID if provided
        node.id = nodeData.id;
        // Override label if provided
        if (nodeData.label) {
            node.label = nodeData.label;
        }
        // Add to editor
        await this.editor.addNode(node);
        // Store in map
        this.nodeMap.set(nodeData.id, node);
        // Call lifecycle hook
        if (node.onAdded) {
            node.onAdded();
        }
        this.logger?.debug('Node added', {
            id: nodeData.id,
            type: nodeData.type,
        });
    }
    async addConnection(connData) {
        const sourceNode = this.nodeMap.get(connData.source);
        const targetNode = this.nodeMap.get(connData.target);
        if (!sourceNode || !targetNode) {
            throw new Error('Connection references non-existent node');
        }
        // Create Rete connection
        const connection = new ClassicPreset.Connection(sourceNode, connData.sourceOutput, targetNode, connData.targetInput);
        await this.editor.addConnection(connection);
        // Call lifecycle hooks
        if (sourceNode.onConnected) {
            sourceNode.onConnected(connData.sourceOutput, targetNode, connData.targetInput);
        }
        this.logger?.debug('Connection added', {
            source: connData.source,
            target: connData.target,
        });
    }
}
//# sourceMappingURL=engine.js.map