/**
 * Response Normalizer Node
 * Converts Anthropic raw response to normalized ACP response format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { AnthropicRawResponse } from './client.js';

/**
 * Normalized ACP response structure
 */
export interface NormalizedResponse {
  /** Content blocks */
  content: Array<{ type: string; text: string }>;

  /** Stop reason */
  stop_reason: string | null;

  /** Token usage */
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };

  /** Backend identifier */
  backend: string;

  /** Original model used */
  model?: string;

  /** Backend-specific message ID */
  id?: string;
}

/**
 * Configuration for Response Normalizer
 */
export interface ResponseNormalizerConfig extends Record<string, unknown> {
  /** Include model in response */
  includeModel?: boolean;

  /** Include message ID in response */
  includeId?: boolean;
}

/**
 * Response Normalizer Node
 * 
 * Converts backend-specific response format to normalized ACP response.
 * Currently supports Anthropic responses.
 */
export class ResponseNormalizerNode extends AcphastNode {
  static override meta = {
    name: 'Response Normalizer',
    category: 'transform' as const,
    description: 'Convert backend response to ACP format',
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

  constructor(config: ResponseNormalizerConfig = {}) {
    super('Response Normalizer', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Raw Response'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Normalized Response'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('ResponseNormalizerNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.normalize(message))
    );

    return { out: output$ };
  }

  /**
   * Normalize response to ACP format
   */
  private normalize(message: PipelineMessage): PipelineMessage {
    const config = this.config as ResponseNormalizerConfig;
    const rawResponse = message.response as AnthropicRawResponse;
    const backend = message.backend || 'unknown';

    if (!rawResponse) {
      this.logger?.warn('No response to normalize');
      return message;
    }

    // Build normalized response
    const normalized: NormalizedResponse = {
      content: rawResponse.content || [],
      stop_reason: rawResponse.stop_reason,
      backend,
    };

    // Include usage if present
    if (rawResponse.usage) {
      normalized.usage = {
        input_tokens: rawResponse.usage.input_tokens,
        output_tokens: rawResponse.usage.output_tokens,
      };
    }

    // Optionally include model and ID
    if (config.includeModel !== false && rawResponse.model) {
      normalized.model = rawResponse.model;
    }

    if (config.includeId !== false && rawResponse.id) {
      normalized.id = rawResponse.id;
    }

    this.logger?.debug('Normalized response', {
      backend,
      contentLength: normalized.content.length,
      stopReason: normalized.stop_reason,
    });

    return {
      ...message,
      response: normalized,
    };
  }
}
