/**
 * Streaming Node Base Class
 * For nodes that produce streaming outputs (LLM adapters)
 */

import { Observable, mergeMap } from 'rxjs';
import { AcphastNode } from './node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Base class for nodes that produce streaming outputs
 * Used primarily for LLM adapter nodes
 */
export abstract class StreamingNode extends AcphastNode {
  /**
   * Process a single input message and return a stream of updates
   * Override this method to implement streaming logic
   */
  abstract processStream(
    message: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage>;

  /**
   * Default process implementation that handles streaming
   * Takes all inputs and merges their streams
   */
  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    // Get the first input port (streaming nodes typically have one input)
    const inputPort = Object.keys(inputs)[0];
    const input$ = inputs[inputPort]?.[0];

    if (!input$) {
      this.logger?.warn('StreamingNode received no input');
      return {};
    }

    // Transform each input message into a stream of outputs
    const output$ = input$.pipe(
      mergeMap((message) => this.processStream(message, ctx))
    );

    // Return on the 'out' port (streaming nodes typically have one output)
    return { out: output$ };
  }

  /**
   * Helper: Send streaming update via context
   */
  protected sendUpdate(ctx: PipelineContext, update: unknown): void {
    if (ctx.onUpdate) {
      ctx.onUpdate({
        method: 'session/update',
        params: update as Record<string, unknown>,
      });
    }
  }
}
