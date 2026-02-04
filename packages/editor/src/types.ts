/**
 * Editor Types
 * Type definitions for the visual graph editor
 */

import type { ClassicPreset } from 'rete';
import type { ReactArea2D } from 'rete-react-plugin';
import type { NodeMetadata } from '@acphast/nodes';
import type { SerializedGraph } from '@acphast/engine';

// Re-export for convenience
export type { SerializedGraph };

/**
 * Rete.js Schemes type for Acphast editor
 * Using ClassicPreset.Node directly for better type compatibility
 */
export type Schemes = {
  Node: ClassicPreset.Node;
  Connection: ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>;
};

/**
 * Area extras for React rendering
 */
export type AreaExtra = ReactArea2D<Schemes>;

/**
 * Node palette item
 */
export interface PaletteItem {
  /** Node type name */
  type: string;
  /** Node metadata */
  meta: NodeMetadata;
  /** Category for grouping */
  category: NodeMetadata['category'];
}

/**
 * Editor state
 */
export interface EditorState {
  /** Current graph data */
  graph: SerializedGraph | null;
  /** Selected node IDs */
  selectedNodes: string[];
  /** Whether graph has unsaved changes */
  isDirty: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Editor callbacks
 */
export interface EditorCallbacks {
  /** Called when graph changes */
  onChange?: (graph: SerializedGraph) => void;
  /** Called when nodes are selected */
  onSelect?: (nodeIds: string[]) => void;
  /** Called when save is requested */
  onSave?: (graph: SerializedGraph) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Editor configuration
 */
export interface EditorConfig {
  /** Available node types (from registry) */
  nodeTypes: Map<string, NodeMetadata>;
  /** Initial graph to load */
  initialGraph?: SerializedGraph;
  /** Whether editor is read-only */
  readOnly?: boolean;
  /** Callbacks */
  callbacks?: EditorCallbacks;
}

/**
 * Position in 2D space
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Node position map
 */
export type NodePositions = Map<string, Position>;
