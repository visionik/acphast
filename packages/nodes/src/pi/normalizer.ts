/**
 * Pi Normalizer Node
 * Converts Pi raw response to ACP format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { PiRawResponse } from './client.js';

/**
 * Configuration for Pi normalizer
 */
export interface PiNormalizerConfig extends Record<string, unknown> {
  /** Include raw events in normalized response */
  includeRawEvents?: boolean;
}

/**
 * Pi Normalizer Node
 * 
 * Converts Pi raw response format to ACP response format.
 * Extracts text, stop reason, and usage information.
 */
export class PiNormalizerNode extends AcphastNode {
  static override meta = {
    name: 'Pi Normalizer',
    category: 'transform' as const,
    description: 'Convert Pi response to ACP format',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'Raw Response',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Normalized Response',
      },
    ],
  };

  constructor(config: PiNormalizerConfig = {}) {
    super('Pi Normalizer', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Raw Response'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Normalized Response'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('PiNormalizerNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.normalize(message))
    );

    return { out: output$ };
  }

  /**
   * Normalize Pi raw response to ACP format
   */
  private normalize(message: PipelineMessage): PipelineMessage {
    const config = this.config as PiNormalizerConfig;
    const rawResponse = message.response as PiRawResponse;

    if (!rawResponse) {
      this.logger?.warn('No raw response found in message');
      return message;
    }

    // Build ACP-formatted response
    const normalized = {
      content: [
        {
          type: 'text',
          text: rawResponse.fullText,
        },
      ],
      stop_reason: rawResponse.stopReason || 'end_turn',
      usage: rawResponse.usage
        ? {
            input_tokens: rawResponse.usage.inputTokens,
            output_tokens: rawResponse.usage.outputTokens,
          }
        : undefined,
    };

    // Optionally preserve raw events in metadata
    const _meta: Record<string, unknown> = {};
    if (config.includeRawEvents) {
      _meta.pi = {
        rawEvents: rawResponse.events,
      };
    }

    this.logger?.debug('Normalized Pi response to ACP format', {
      textLength: rawResponse.fullText.length,
      stopReason: rawResponse.stopReason,
      hasUsage: !!rawResponse.usage,
    });

    return {
      ...message,
      response: normalized,
      _meta: Object.keys(_meta).length > 0 ? _meta : undefined,
    };
  }
}
