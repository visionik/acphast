/**
 * Combiner Node
 * Merges two input streams into one output, sequenced by time
 */

import { Observable, merge } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Configuration for Combiner
 */
export interface CombinerConfig extends Record<string, unknown> {
  // No additional config needed for now
}

/**
 * Combiner Node
 * 
 * Takes two inputs and merges them into a single output stream.
 * Messages are emitted in the order they arrive (time-sequenced).
 * 
 * Useful for:
 * - Merging results from parallel backends
 * - Combining multiple data sources
 * - Aggregating split pipeline results
 */
export class CombinerNode extends AcphastNode {
  static override meta = {
    name: 'Combiner',
    category: 'routing' as const,
    description: 'Merge two inputs by arrival time',
    inputs: [
      {
        name: 'in1',
        type: 'pipeline' as const,
        label: 'Input 1',
        required: false,
      },
      {
        name: 'in2',
        type: 'pipeline' as const,
        label: 'Input 2',
        required: false,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Combined',
      },
    ],
  };

  constructor(config: CombinerConfig = {}) {
    super('Combiner', config);

    this.addInput('in1', new ClassicPreset.Input(Sockets.pipeline, 'Input 1'));
    this.addInput('in2', new ClassicPreset.Input(Sockets.pipeline, 'Input 2'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Combined'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input1$ = inputs.in1?.[0];
    const input2$ = inputs.in2?.[0];

    // If no inputs, return empty
    if (!input1$ && !input2$) {
      this.logger?.warn('CombinerNode received no inputs');
      return {};
    }

    // If only one input, pass it through
    if (!input1$) {
      this.logger?.debug('CombinerNode has only input 2');
      return { out: input2$ };
    }
    if (!input2$) {
      this.logger?.debug('CombinerNode has only input 1');
      return { out: input1$ };
    }

    // Merge both inputs, emitting messages as they arrive
    this.logger?.debug('CombinerNode merging two inputs');
    const combined$ = merge(input1$, input2$);

    return { out: combined$ };
  }
}
