/**
 * Router Node Base Class
 * For nodes that route messages to different outputs based on conditions
 */

import { Observable, map } from 'rxjs';
import { AcphastNode } from './node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Base class for routing nodes
 * Routes input to different output ports based on logic
 */
export abstract class RouterNode extends AcphastNode {
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
  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    // Get the input observable
    const inputPort = Object.keys(inputs)[0];
    const input$ = inputs[inputPort]?.[0];

    if (!input$) {
      this.logger?.warn('RouterNode received no input');
      return {};
    }

    // Create output observables for each possible route
    const outputs: Record<string, Observable<PipelineMessage>> = {};
    const meta = (this.constructor as typeof RouterNode).meta;

    // For each defined output port
    for (const outputDef of meta.outputs) {
      const portName = outputDef.name;

      // Filter messages that route to this port
      outputs[portName] = input$.pipe(
        map((message) => {
          const routeTo = this.route(message, ctx);
          return routeTo === portName ? message : null;
        }),
        // Filter out null values (messages not routed to this port)
        map((msg) => msg as PipelineMessage)
      );
    }

    return outputs;
  }

  /**
   * Helper: Extract metadata for routing decisions
   */
  protected getMeta(message: PipelineMessage, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = message.request.params?._meta;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
