/**
 * Base Node Classes for Acphast
 */
import { ClassicPreset } from 'rete';
/**
 * Base class for all Acphast nodes
 */
export class AcphastNode extends ClassicPreset.Node {
    /** Node metadata for editor */
    static meta;
    /** Node configuration */
    config;
    /** Logger instance */
    logger;
    constructor(label, config = {}) {
        super(label);
        this.config = config;
    }
    /**
     * Set logger instance
     */
    setLogger(logger) {
        this.logger = logger;
    }
    /**
     * Update node configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Validate node configuration
     * Override this to add custom validation
     */
    validate() {
        const errors = [];
        const meta = this.constructor.meta;
        if (meta.configSchema) {
            // TODO: Add Zod validation when schema is provided
        }
        return errors;
    }
}
/**
 * Helper to get node metadata
 */
export function getNodeMetadata(nodeClass) {
    return nodeClass.meta;
}
//# sourceMappingURL=node.js.map