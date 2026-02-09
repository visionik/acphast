/**
 * Splitter Node
 * Duplicates incoming message to multiple outputs
 */

import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Configuration for Splitter
 */
export interface SplitterConfig extends Record<string, unknown> {
  /** Number of output ports (default: 2) */
  outputCount?: number;
}

/**
 * Splitter Node
 * 
 * Takes one input and duplicates it to multiple outputs.
 * Useful for:
 * - Sending the same request to multiple backends
 * - Parallel processing pipelines
 * - A/B testing different models
 */
export class SplitterNode extends AcphastNode {
  static override meta = {
    name: 'Splitter',
    category: 'routing' as const,
    description: 'Duplicate message to multiple outputs',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'Input',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out1',
        type: 'pipeline' as const,
        label: 'Output 1',
      },
      {
        name: 'out2',
        type: 'pipeline' as const,
        label: 'Output 2',
      },
    ],
  };

  constructor(config: SplitterConfig = {}) {
    super('Splitter', config);

    const outputCount = config.outputCount || 2;

    // Add input
    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Input'));

    // Add outputs dynamically
    for (let i = 1; i <= outputCount; i++) {
      this.addOutput(`out${i}`, new ClassicPreset.Output(Sockets.pipeline, `Output ${i}`));
    }
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('SplitterNode received no input');
      return {};
    }

    const config = this.config as SplitterConfig;
    const outputCount = config.outputCount || 2;

    this.logger?.debug('Splitter duplicating message', {
      outputCount,
    });

    // Duplicate the input observable to all outputs
    const outputs: Record<string, Observable<PipelineMessage>> = {};
    for (let i = 1; i <= outputCount; i++) {
      outputs[`out${i}`] = input$;
    }

    return outputs;
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as SplitterConfig;

    if (config.outputCount !== undefined) {
      if (config.outputCount < 2) {
        errors.push('outputCount must be at least 2');
      }
      if (config.outputCount > 10) {
        errors.push('outputCount must be at most 10');
      }
    }

    return errors;
  }
}
