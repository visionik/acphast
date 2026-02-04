/**
 * Node Registry
 * Manages registration and instantiation of node types
 */
import type { AcphastNode, NodeMetadata, NodeConstructor } from './base/node.js';
/**
 * Node registry for managing available node types
 */
export declare class NodeRegistry {
    private nodes;
    /**
     * Register a node type
     */
    register(nodeClass: NodeConstructor): void;
    /**
     * Register multiple node types at once
     */
    registerMany(nodeClasses: NodeConstructor[]): void;
    /**
     * Unregister a node type
     */
    unregister(typeName: string): void;
    /**
     * Create a node instance by type name
     */
    create(typeName: string, config?: Record<string, unknown>): AcphastNode;
    /**
     * Get node metadata by type name
     */
    getMeta(typeName: string): NodeMetadata;
    /**
     * Check if a node type is registered
     */
    has(typeName: string): boolean;
    /**
     * Get all registered node types
     */
    list(): string[];
    /**
     * Get all nodes by category
     */
    listByCategory(category: NodeMetadata['category']): string[];
    /**
     * Get all node metadata
     */
    getAllMetadata(): Map<string, NodeMetadata>;
    /**
     * Clear all registrations
     */
    clear(): void;
}
/**
 * Global node registry instance
 */
export declare const globalRegistry: NodeRegistry;
//# sourceMappingURL=registry.d.ts.map