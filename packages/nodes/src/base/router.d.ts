/**
 * Router Node Base Class
 * For nodes that route messages to different outputs based on conditions
 */
import { Observable } from 'rxjs';
import { AcphastNode } from './node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
/**
 * Base class for routing nodes
 * Routes input to different output ports based on logic
 */
export declare abstract class RouterNode extends AcphastNode {
    /**
     * Determine which output port to route the message to
     * Override this method to implement routing logic
     *
     * @returns Output port name, or null to drop the message
     */
    abstract route(message: PipelineMessage, ctx: PipelineContext): string | null;
    /**
     * Default process implementation for routing
     * Routes each message to the appropriate output port
     */
    process(inputs: Record<string, Observable<PipelineMessage>[]>, ctx: PipelineContext): Record<string, Observable<PipelineMessage>>;
    /**
     * Helper: Extract metadata for routing decisions
     */
    protected getMeta(message: PipelineMessage, path: string): unknown;
}
//# sourceMappingURL=router.d.ts.map