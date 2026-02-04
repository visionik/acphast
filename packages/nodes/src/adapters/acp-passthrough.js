/**
 * ACP Passthrough Adapter Node
 * Forwards ACP messages to another ACP agent without translation
 */
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
/**
 * ACP Passthrough Adapter Node
 *
 * This is the simplest adapter - it forwards messages to another
 * ACP agent without any translation. Useful for:
 * - Testing the pipeline
 * - Chaining multiple Acphast instances
 * - Proxying to ACP-native backends
 */
export class ACPPassthroughNode extends AcphastNode {
    static meta = {
        name: 'ACP Passthrough',
        category: 'adapter',
        description: 'Forward messages to another ACP agent without translation',
        inputs: [
            {
                name: 'in',
                type: 'pipeline',
                label: 'Input',
                required: true,
            },
        ],
        outputs: [
            {
                name: 'out',
                type: 'pipeline',
                label: 'Output',
            },
        ],
    };
    constructor(config) {
        super('ACP Passthrough', config);
        // Add input port
        this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Input'));
        // Add output port
        this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Output'));
    }
    process(inputs, _ctx) {
        const input$ = inputs.in?.[0];
        if (!input$) {
            this.logger?.warn('ACPPassthroughNode received no input');
            return {};
        }
        // For now, just pass through the message unchanged
        // In a full implementation, this would:
        // 1. Connect to the target ACP agent
        // 2. Forward the request
        // 3. Stream back the response
        // 4. Handle errors and retries
        this.logger?.debug('ACPPassthrough forwarding message', {
            endpoint: this.config.endpoint,
            type: this.config.type,
        });
        // Simple passthrough for now
        // TODO: Implement actual ACP client connection
        return { out: input$ };
    }
    /**
     * Validate configuration
     */
    validate() {
        const errors = super.validate();
        const config = this.config;
        if (!config.endpoint) {
            errors.push('endpoint is required');
        }
        if (!config.type || !['stdio', 'http', 'websocket'].includes(config.type)) {
            errors.push('type must be one of: stdio, http, websocket');
        }
        return errors;
    }
    /**
     * Lifecycle: Initialize connection when node is added
     */
    onAdded() {
        this.logger?.info('ACPPassthrough node added', {
            endpoint: this.config.endpoint,
        });
        // TODO: Initialize connection to target agent
    }
    /**
     * Lifecycle: Close connection when node is removed
     */
    onRemoved() {
        this.logger?.info('ACPPassthrough node removed');
        // TODO: Close connection to target agent
    }
}
//# sourceMappingURL=acp-passthrough.js.map