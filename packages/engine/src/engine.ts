/**
 * Graph Execution Engine
 * Core engine for executing Rete.js graphs with RxJS observables
 */

import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { Observable, merge, EMPTY } from 'rxjs';
import type { PipelineMessage, PipelineContext, Logger } from '@acphast/core';
import type { AcphastNode } from '@acphast/nodes';
import { NodeRegistry } from '@acphast/nodes';
import type { SerializedGraph, SerializedNode, SerializedConnection } from './graph.js';
import { validateGraph } from './graph.js';

/**
 * Rete.js schemes type
 */
type Schemes = GetSchemes<AcphastNode, ClassicPreset.Connection<AcphastNode, AcphastNode>>;

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
export class AcphastEngine {
  private editor: NodeEditor<Schemes>;
  private registry: NodeRegistry;
  private logger?: Logger;
  private nodeMap = new Map<string, AcphastNode>();

  constructor(config: EngineConfig) {
    this.registry = config.registry;
    this.logger = config.logger;

    // Create Rete editor
    this.editor = new NodeEditor<Schemes>();
  }

  /**
   * Load a graph from serialized JSON
   */
  async loadGraph(graph: SerializedGraph | string): Promise<void> {
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
  async exportGraph(): Promise<SerializedGraph> {
    const nodes: SerializedNode[] = [];
    const connections: SerializedConnection[] = [];

    // Export nodes
    for (const [id, node] of this.nodeMap.entries()) {
      nodes.push({
        id,
        type: (node.constructor as typeof AcphastNode).meta.name,
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
   * Traverses from entry node through all connected nodes
   */
  async execute(
    entryNodeId: string,
    message: PipelineMessage,
    ctx: PipelineContext
  ): Promise<Observable<PipelineMessage>> {
    const entryNode = this.nodeMap.get(entryNodeId);
    if (!entryNode) {
      throw new Error(`Entry node not found: ${entryNodeId}`);
    }

    this.logger?.debug('Executing graph', {
      entryNode: entryNodeId,
      requestId: ctx.requestId,
    });

    // Create an observable from the input message
    const input$ = new Observable<PipelineMessage>((subscriber) => {
      subscriber.next(message);
      subscriber.complete();
    });

    // Execute starting from entry node, following connections
    return this.executeNode(entryNodeId, { in: [input$] }, ctx);
  }

  /**
   * Execute a single node and follow its output connections
   */
  private executeNode(
    nodeId: string,
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Observable<PipelineMessage> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Process through this node
    const outputs = node.process(inputs, ctx);

    // Find connections from this node's outputs
    const connections = this.editor.getConnections().filter(
      (conn) => conn.source === nodeId
    );

    // If no outgoing connections, return the outputs directly
    if (connections.length === 0) {
      const outputStreams = Object.values(outputs);
      if (outputStreams.length === 0) {
        return EMPTY;
      }
      return merge(...outputStreams);
    }

    // Group connections by target node
    const targetInputs = new Map<string, Record<string, Observable<PipelineMessage>[]>>();
    
    for (const conn of connections) {
      const sourceOutput$ = outputs[conn.sourceOutput];
      if (!sourceOutput$) continue;

      if (!targetInputs.has(conn.target)) {
        targetInputs.set(conn.target, {});
      }
      
      const targetNodeInputs = targetInputs.get(conn.target)!;
      if (!targetNodeInputs[conn.targetInput]) {
        targetNodeInputs[conn.targetInput] = [];
      }
      targetNodeInputs[conn.targetInput].push(sourceOutput$);
    }

    // Execute each target node and merge results
    const resultStreams: Observable<PipelineMessage>[] = [];
    
    for (const [targetNodeId, targetNodeInputs] of targetInputs.entries()) {
      const result$ = this.executeNode(targetNodeId, targetNodeInputs, ctx);
      resultStreams.push(result$);
    }

    if (resultStreams.length === 0) {
      return EMPTY;
    }

    return merge(...resultStreams);
  }

  /**
   * Clear all nodes and connections
   */
  async clear(): Promise<void> {
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
  getNode(id: string): AcphastNode | undefined {
    return this.nodeMap.get(id);
  }

  /**
   * Get all nodes
   */
  getNodes(): Map<string, AcphastNode> {
    return new Map(this.nodeMap);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    connectionCount: number;
  } {
    return {
      nodeCount: this.nodeMap.size,
      connectionCount: this.editor.getConnections().length,
    };
  }

  // Private methods

  private async addNode(nodeData: SerializedNode): Promise<void> {
    // Create node instance from registry
    const node = this.registry.create(nodeData.type, nodeData.config);

    // Set logger
    if (this.logger) {
      node.setLogger(this.logger.child({ nodeId: nodeData.id, nodeType: nodeData.type }));
    }

    // Override ID if provided
    (node as { id: string }).id = nodeData.id;

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

  private async addConnection(connData: SerializedConnection): Promise<void> {
    const sourceNode = this.nodeMap.get(connData.source);
    const targetNode = this.nodeMap.get(connData.target);

    if (!sourceNode || !targetNode) {
      throw new Error('Connection references non-existent node');
    }

    // Create Rete connection
    const connection = new ClassicPreset.Connection(
      sourceNode,
      connData.sourceOutput,
      targetNode,
      connData.targetInput
    );

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
