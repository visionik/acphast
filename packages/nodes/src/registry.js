/**
 * Node Registry
 * Manages registration and instantiation of node types
 */
/**
 * Node registry for managing available node types
 */
export class NodeRegistry {
    nodes = new Map();
    /**
     * Register a node type
     */
    register(nodeClass) {
        const meta = nodeClass.meta;
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
    registerMany(nodeClasses) {
        for (const nodeClass of nodeClasses) {
            this.register(nodeClass);
        }
    }
    /**
     * Unregister a node type
     */
    unregister(typeName) {
        this.nodes.delete(typeName);
    }
    /**
     * Create a node instance by type name
     */
    create(typeName, config) {
        const NodeClass = this.nodes.get(typeName);
        if (!NodeClass) {
            throw new Error(`Node type '${typeName}' is not registered`);
        }
        return new NodeClass(config);
    }
    /**
     * Get node metadata by type name
     */
    getMeta(typeName) {
        const NodeClass = this.nodes.get(typeName);
        if (!NodeClass) {
            throw new Error(`Node type '${typeName}' is not registered`);
        }
        return NodeClass.meta;
    }
    /**
     * Check if a node type is registered
     */
    has(typeName) {
        return this.nodes.has(typeName);
    }
    /**
     * Get all registered node types
     */
    list() {
        return Array.from(this.nodes.keys());
    }
    /**
     * Get all nodes by category
     */
    listByCategory(category) {
        const result = [];
        for (const [typeName, NodeClass] of this.nodes.entries()) {
            const meta = NodeClass.meta;
            if (meta.category === category) {
                result.push(typeName);
            }
        }
        return result;
    }
    /**
     * Get all node metadata
     */
    getAllMetadata() {
        const result = new Map();
        for (const [typeName, NodeClass] of this.nodes.entries()) {
            const meta = NodeClass.meta;
            result.set(typeName, meta);
        }
        return result;
    }
    /**
     * Clear all registrations
     */
    clear() {
        this.nodes.clear();
    }
}
/**
 * Global node registry instance
 */
export const globalRegistry = new NodeRegistry();
//# sourceMappingURL=registry.js.map