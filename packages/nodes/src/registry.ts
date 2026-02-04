/**
 * Node Registry
 * Manages registration and instantiation of node types
 */

import type { AcphastNode, NodeMetadata, NodeConstructor } from './base/node.js';

/**
 * Node registry for managing available node types
 */
export class NodeRegistry {
  private nodes = new Map<string, NodeConstructor>();

  /**
   * Register a node type
   */
  register(nodeClass: NodeConstructor): void {
    const meta = (nodeClass as unknown as typeof AcphastNode).meta;
    if (!meta) {
      throw new Error(`Node class must have static 'meta' property`);
    }

    const typeName = meta.name;
    if (this.nodes.has(typeName)) {
      throw new Error(`Node type '${typeName}' is already registered`);
    }

    this.nodes.set(typeName, nodeClass);
  }

  /**
   * Register multiple node types at once
   */
  registerMany(nodeClasses: NodeConstructor[]): void {
    for (const nodeClass of nodeClasses) {
      this.register(nodeClass);
    }
  }

  /**
   * Unregister a node type
   */
  unregister(typeName: string): void {
    this.nodes.delete(typeName);
  }

  /**
   * Create a node instance by type name
   */
  create(typeName: string, config?: Record<string, unknown>): AcphastNode {
    const NodeClass = this.nodes.get(typeName);
    if (!NodeClass) {
      throw new Error(`Node type '${typeName}' is not registered`);
    }

    return new NodeClass(config);
  }

  /**
   * Get node metadata by type name
   */
  getMeta(typeName: string): NodeMetadata {
    const NodeClass = this.nodes.get(typeName);
    if (!NodeClass) {
      throw new Error(`Node type '${typeName}' is not registered`);
    }

    return (NodeClass as unknown as typeof AcphastNode).meta;
  }

  /**
   * Check if a node type is registered
   */
  has(typeName: string): boolean {
    return this.nodes.has(typeName);
  }

  /**
   * Get all registered node types
   */
  list(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all nodes by category
   */
  listByCategory(category: NodeMetadata['category']): string[] {
    const result: string[] = [];

    for (const [typeName, NodeClass] of this.nodes.entries()) {
      const meta = (NodeClass as unknown as typeof AcphastNode).meta;
      if (meta.category === category) {
        result.push(typeName);
      }
    }

    return result;
  }

  /**
   * Get all node metadata
   */
  getAllMetadata(): Map<string, NodeMetadata> {
    const result = new Map<string, NodeMetadata>();

    for (const [typeName, NodeClass] of this.nodes.entries()) {
      const meta = (NodeClass as unknown as typeof AcphastNode).meta;
      result.set(typeName, meta);
    }

    return result;
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.nodes.clear();
  }
}

/**
 * Global node registry instance
 */
export const globalRegistry = new NodeRegistry();
