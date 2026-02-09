/**
 * Visual marker nodes for graph entry and exit points
 */

import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Input marker node - visual indicator for where ACP requests enter the graph
 */
export class ACPInputNode extends AcphastNode {
  static override meta = {
    name: 'ACP Input',
    category: 'input' as const,
    description: 'Entry point for ACP requests',
    inputs: [],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Request',
      },
    ],
  };

  constructor() {
    super('ACP Input', {});

    // Output socket for passing the request through
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Request'));
  }

  process(
    _inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    // This node doesn't process inputs - it's a visual marker
    // In practice, the engine would inject messages here at runtime
    return { out: EMPTY };
  }
}

/**
 * Output marker node - visual indicator for where ACP responses exit the graph
 */
export class ACPOutputNode extends AcphastNode {
  static override meta = {
    name: 'ACP Output',
    category: 'output' as const,
    description: 'Exit point for ACP responses',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'Response',
        required: true,
      },
    ],
    outputs: [],
  };

  constructor() {
    super('ACP Output', {});

    // Input socket for receiving the response
    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Response'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs['in']?.[0];

    if (!input$) {
      return {};
    }

    // Pass through and log the message (this is the final node)
    return {
      out: input$.pipe(
        map((msg) => {
          ctx.logger?.info('Response exiting graph', {
            requestId: ctx.requestId,
            backend: msg.backend,
          });
          return msg;
        })
      ),
    };
  }
}
