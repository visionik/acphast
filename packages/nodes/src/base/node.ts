/**
 * Base Node Classes for Acphast
 */

import { ClassicPreset } from 'rete';
import type { Observable } from 'rxjs';
import type { PipelineMessage, PipelineContext, Logger } from '@acphast/core';

/**
 * Node metadata for visual editor
 */
export interface NodeMetadata {
  /** Display name */
  name: string;

  /** Node category for palette organization */
  category: 'input' | 'output' | 'routing' | 'transform' | 'adapter' | 'utility';

  /** Short description */
  description: string;

  /** Input port definitions */
  inputs: PortDefinition[];

  /** Output port definitions */
  outputs: PortDefinition[];

  /** Configuration schema (optional) */
  configSchema?: unknown;
}

/**
 * Port definition for inputs/outputs
 */
export interface PortDefinition {
  /** Port identifier */
  name: string;

  /** Port type (socket name) */
  type: 'pipeline' | 'control' | 'config';

  /** Display label */
  label: string;

  /** Is this port required? */
  required?: boolean;
}

/**
 * Base class for all Acphast nodes
 */
export abstract class AcphastNode extends ClassicPreset.Node {
  /** Node metadata for editor */
  static meta: NodeMetadata;

  /** Node configuration */
  config: Record<string, unknown>;

  /** Logger instance */
  protected logger?: Logger;

  constructor(label: string, config: Record<string, unknown> = {}) {
    super(label);
    this.config = config;
  }

  /**
   * Process inputs and return outputs
   * All Acphast nodes must implement this method
   */
  abstract process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>>;

  /**
   * Set logger instance
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Update node configuration
   */
  updateConfig(config: Record<string, unknown>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate node configuration
   * Override this to add custom validation
   */
  validate(): string[] {
    const errors: string[] = [];
    const meta = (this.constructor as typeof AcphastNode).meta;

    if (meta.configSchema) {
      // TODO: Add Zod validation when schema is provided
    }

    return errors;
  }

  /**
   * Lifecycle: Called when node is added to graph
   */
  onAdded?(): void;

  /**
   * Lifecycle: Called when node is removed from graph
   */
  onRemoved?(): void;

  /**
   * Lifecycle: Called when node is connected to another node
   */
  onConnected?(port: string, targetNode: AcphastNode, targetPort: string): void;

  /**
   * Lifecycle: Called when node is disconnected
   */
  onDisconnected?(port: string): void;
}

/**
 * Helper to get node metadata
 */
export function getNodeMetadata(nodeClass: typeof AcphastNode): NodeMetadata {
  return nodeClass.meta;
}

/**
 * Helper to create a node instance from type name
 */
export type NodeConstructor = new (config?: Record<string, unknown>) => AcphastNode;
