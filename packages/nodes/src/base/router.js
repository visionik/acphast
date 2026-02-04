/**
 * Router Node Base Class
 * For nodes that route messages to different outputs based on conditions
 */
import { map } from 'rxjs';
import { AcphastNode } from './node.js';
/**
 * Base class for routing nodes
 * Routes input to different output ports based on logic
 */
export class RouterNode extends AcphastNode {
    /**
     * Default process implementation for routing
     * Routes each message to the appropriate output port
     */
    process(inputs, ctx) {
        // Get the input observable
        const inputPort = Object.keys(inputs)[0];
        const input$ = inputs[inputPort]?.[0];
        if (!input$) {
            this.logger?.warn('RouterNode received no input');
            return {};
        }
        // Create output observables for each possible route
        const outputs = {};
        const meta = this.constructor.meta;
        // For each defined output port
        for (const outputDef of meta.outputs) {
            const portName = outputDef.name;
            // Filter messages that route to this port
            outputs[portName] = input$.pipe(map((message) => {
                const routeTo = this.route(message, ctx);
                return routeTo === portName ? message : null;
            }), 
            // Filter out null values (messages not routed to this port)
            map((msg) => msg));
        }
        return outputs;
    }
    /**
     * Helper: Extract metadata for routing decisions
     */
    getMeta(message, path) {
        const parts = path.split('.');
        let current = message.request.params?._meta;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
}
//# sourceMappingURL=router.js.map