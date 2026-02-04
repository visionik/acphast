/**
 * Streaming Node Base Class
 * For nodes that produce streaming outputs (LLM adapters)
 */
import { Observable } from 'rxjs';
import { AcphastNode } from './node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
/**
 * Base class for nodes that produce streaming outputs
 * Used primarily for LLM adapter nodes
 */
export declare abstract class StreamingNode extends AcphastNode {
    /**
     * Process a single input message and return a stream of updates
     * Override this method to implement streaming logic
     */
    abstract processStream(message: PipelineMessage, ctx: PipelineContext): Observable<PipelineMessage>;
    /**
     * Default process implementation that handles streaming
     * Takes all inputs and merges their streams
     */
    process(inputs: Record<string, Observable<PipelineMessage>[]>, ctx: PipelineContext): Record<string, Observable<PipelineMessage>>;
    /**
     * Helper: Send streaming update via context
     */
    protected sendUpdate(ctx: PipelineContext, update: unknown): void;
}
//# sourceMappingURL=streaming.d.ts.map