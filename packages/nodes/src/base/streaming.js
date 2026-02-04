/**
 * Streaming Node Base Class
 * For nodes that produce streaming outputs (LLM adapters)
 */
import { mergeMap } from 'rxjs';
import { AcphastNode } from './node.js';
/**
 * Base class for nodes that produce streaming outputs
 * Used primarily for LLM adapter nodes
 */
export class StreamingNode extends AcphastNode {
    /**
     * Default process implementation that handles streaming
     * Takes all inputs and merges their streams
     */
    process(inputs, ctx) {
        // Get the first input port (streaming nodes typically have one input)
        const inputPort = Object.keys(inputs)[0];
        const input$ = inputs[inputPort]?.[0];
        if (!input$) {
            this.logger?.warn('StreamingNode received no input');
            return {};
        }
        // Transform each input message into a stream of outputs
        const output$ = input$.pipe(mergeMap((message) => this.processStream(message, ctx)));
        // Return on the 'out' port (streaming nodes typically have one output)
        return { out: output$ };
    }
    /**
     * Helper: Send streaming update via context
     */
    sendUpdate(ctx, update) {
        if (ctx.onUpdate) {
            ctx.onUpdate({
                method: 'session/update',
                params: update,
            });
        }
    }
}
//# sourceMappingURL=streaming.js.map