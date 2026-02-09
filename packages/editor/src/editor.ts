/**
 * Editor Core
 * Rete.js editor setup and management
 */

import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions, Zoom } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin';
import { createRoot } from 'react-dom/client';

import type { AcphastNode, NodeRegistry } from '@acphast/nodes';
import type { SerializedGraph, SerializedNode, SerializedConnection } from '@acphast/engine';
import type { Schemes, AreaExtra, Position } from './types.js';

/**
 * Editor instance with all plugins configured
 */
export interface EditorInstance {
  /** Rete NodeEditor */
  editor: NodeEditor<Schemes>;
  /** Area plugin for visual rendering */
  area: AreaPlugin<Schemes, AreaExtra>;
  /** Destroy the editor */
  destroy: () => void;
  /** Add a node to the editor */
  addNode: (type: string, position: Position, config?: Record<string, unknown>) => Promise<string>;
  /** Remove a node from the editor */
  removeNode: (id: string) => Promise<void>;
  /** Add a connection between nodes */
  addConnection: (source: string, sourceOutput: string, target: string, targetInput: string) => Promise<void>;
  /** Remove a connection */
  removeConnection: (id: string) => Promise<void>;
  /** Export graph to serialized format */
  exportGraph: () => SerializedGraph;
  /** Import graph from serialized format */
  importGraph: (graph: SerializedGraph) => Promise<void>;
  /** Clear all nodes and connections */
  clear: () => Promise<void>;
  /** Zoom to fit all nodes */
  zoomToFit: () => Promise<void>;
}

/**
 * Editor setup options
 */
export interface EditorSetupOptions {
  /** Container element for the editor */
  container: HTMLElement;
  /** Node registry with available node types */
  registry: NodeRegistry;
  /** Callback when graph changes */
  onChange?: (graph: SerializedGraph) => void;
  /** Whether editor is read-only */
  readOnly?: boolean;
}

/**
 * Create and setup the Rete.js editor
 */
export async function createEditor(options: EditorSetupOptions): Promise<EditorInstance> {
  const { container, registry, onChange, readOnly = false } = options;

  // Create editor
  const editor = new NodeEditor<Schemes>();

  // Create area plugin
  const area = new AreaPlugin<Schemes, AreaExtra>(container);

  // Create connection plugin
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  connection.addPreset(ConnectionPresets.classic.setup());

  // Create React rendering plugin
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });
  render.addPreset(ReactPresets.classic.setup());

  // Use plugins
  editor.use(area);
  area.use(connection);
  area.use(render);

  // Enable area extensions
  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl(),
  });

  // Set zoom handler with reduced intensity (1/10 of default 0.1 = 0.01)
  area.area.setZoomHandler(new Zoom(0.01));

  if (!readOnly) {
    AreaExtensions.simpleNodesOrder(area);
  }

  // Track node positions
  const nodePositions = new Map<string, Position>();

  // Add right-click to delete nodes
  if (!readOnly) {
    container.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      
      // Find which node was clicked by checking all node views
      const nodes = editor.getNodes();
      for (const node of nodes) {
        const view = area.nodeViews.get(node.id);
        if (view && view.element) {
          const rect = view.element.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            await removeNode(node.id);
            return;
          }
        }
      }
    });
  }

  // Listen for changes
  editor.addPipe((context) => {
    if (['nodecreated', 'noderemoved', 'connectioncreated', 'connectionremoved'].includes(context.type)) {
      if (onChange) {
        onChange(exportGraph());
      }
    }
    return context;
  });

  // Track node position changes
  area.addPipe((context) => {
    if (context.type === 'nodetranslated') {
      const { id, position } = context.data;
      nodePositions.set(id, position);
      if (onChange) {
        onChange(exportGraph());
      }
    }
    return context;
  });

  /**
   * Add a node to the editor
   */
  async function addNode(
    type: string,
    position: Position,
    config?: Record<string, unknown>
  ): Promise<string> {
    const node = registry.create(type, config);
    await editor.addNode(node);
    await area.translate(node.id, position);
    nodePositions.set(node.id, position);
    return node.id;
  }

  /**
   * Remove a node from the editor
   */
  async function removeNode(id: string): Promise<void> {
    // Remove all connections to/from this node first
    const connections = editor.getConnections().filter(
      (c) => c.source === id || c.target === id
    );
    for (const conn of connections) {
      await editor.removeConnection(conn.id);
    }
    await editor.removeNode(id);
    nodePositions.delete(id);
  }

  /**
   * Add a connection between nodes
   */
  async function addConnection(
    source: string,
    sourceOutput: string,
    target: string,
    targetInput: string
  ): Promise<void> {
    const sourceNode = editor.getNode(source);
    const targetNode = editor.getNode(target);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    const conn = new ClassicPreset.Connection(
      sourceNode,
      sourceOutput,
      targetNode,
      targetInput
    );
    await editor.addConnection(conn);
  }

  /**
   * Remove a connection
   */
  async function removeConnection(id: string): Promise<void> {
    await editor.removeConnection(id);
  }

  /**
   * Export the current graph to serialized format
   */
  function exportGraph(): SerializedGraph {
    const nodes: SerializedNode[] = editor.getNodes().map((node) => {
      const acphastNode = node as AcphastNode;
      const meta = (node.constructor as typeof AcphastNode).meta;
      const position = nodePositions.get(node.id) || { x: 0, y: 0 };

      return {
        id: node.id,
        type: meta.name,
        config: acphastNode.config,
        position,
        label: node.label,
      };
    });

    const connections: SerializedConnection[] = editor.getConnections().map((conn) => ({
      id: conn.id,
      source: conn.source,
      sourceOutput: conn.sourceOutput,
      target: conn.target,
      targetInput: conn.targetInput,
    }));

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
   * Import a graph from serialized format
   */
  async function importGraph(graph: SerializedGraph): Promise<void> {
    await clear();

    // Create nodes
    for (const nodeData of graph.nodes) {
      const node = registry.create(nodeData.type, nodeData.config);
      // Override ID
      (node as { id: string }).id = nodeData.id;
      if (nodeData.label) {
        node.label = nodeData.label;
      }

      await editor.addNode(node);

      const position = nodeData.position || { x: 0, y: 0 };
      await area.translate(node.id, position);
      nodePositions.set(node.id, position);
    }

    // Create connections
    for (const connData of graph.connections) {
      const sourceNode = editor.getNode(connData.source);
      const targetNode = editor.getNode(connData.target);

      if (sourceNode && targetNode) {
        const conn = new ClassicPreset.Connection(
          sourceNode,
          connData.sourceOutput,
          targetNode,
          connData.targetInput
        );
        await editor.addConnection(conn);
      }
    }
  }

  /**
   * Clear all nodes and connections
   */
  async function clear(): Promise<void> {
    for (const conn of editor.getConnections()) {
      await editor.removeConnection(conn.id);
    }
    for (const node of editor.getNodes()) {
      await editor.removeNode(node.id);
    }
    nodePositions.clear();
  }

  /**
   * Zoom to fit all nodes in view
   */
  async function zoomToFit(): Promise<void> {
    await AreaExtensions.zoomAt(area, editor.getNodes());
  }

  /**
   * Destroy the editor
   */
  function destroy(): void {
    area.destroy();
  }

  return {
    editor,
    area,
    destroy,
    addNode,
    removeNode,
    addConnection,
    removeConnection,
    exportGraph,
    importGraph,
    clear,
    zoomToFit,
  };
}
