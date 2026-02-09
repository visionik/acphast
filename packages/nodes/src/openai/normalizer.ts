/**
 * OpenAI Response Normalizer
 * Converts OpenAI raw response to normalized ACP response format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { OpenAIRawResponse } from './client.js';

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
 * Configuration for OpenAI Response Normalizer
 */
export interface OpenAINormalizerConfig extends Record<string, unknown> {
  /** Include model in response */
  includeModel?: boolean;

  /** Include message ID in response */
  includeId?: boolean;
}

/**
 * OpenAI Response Normalizer Node
 * 
 * Converts OpenAI response format to normalized ACP response.
 * Maps OpenAI-specific fields to the common format.
 */
export class OpenAINormalizerNode extends AcphastNode {
  static override meta = {
    name: 'OpenAI Normalizer',
    category: 'transform' as const,
    description: 'Convert OpenAI response to ACP format',
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

  constructor(config: OpenAINormalizerConfig = {}) {
    super('OpenAI Normalizer', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Raw Response'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Normalized Response'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('OpenAINormalizerNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.normalize(message))
    );

    return { out: output$ };
  }

  /**
   * Normalize OpenAI response to ACP format
   */
  private normalize(message: PipelineMessage): PipelineMessage {
    const config = this.config as OpenAINormalizerConfig;
    const rawResponse = message.response as OpenAIRawResponse;
    const backend = message.backend || 'openai';

    if (!rawResponse) {
      this.logger?.warn('No response to normalize');
      return message;
    }

    // Extract content from first choice
    const choice = rawResponse.choices?.[0];
    const content = choice?.message?.content || '';

    // Build normalized response
    const normalized: NormalizedResponse = {
      content: [{ type: 'text', text: content }],
      stop_reason: choice?.finish_reason || null,
      backend,
    };

    // Map OpenAI usage to ACP format
    if (rawResponse.usage) {
      normalized.usage = {
        input_tokens: rawResponse.usage.prompt_tokens,
        output_tokens: rawResponse.usage.completion_tokens,
      };
    }

    // Optionally include model and ID
    if (config.includeModel !== false && rawResponse.model) {
      normalized.model = rawResponse.model;
    }

    if (config.includeId !== false && rawResponse.id) {
      normalized.id = rawResponse.id;
    }

    this.logger?.debug('Normalized OpenAI response', {
      backend,
      contentLength: content.length,
      stopReason: normalized.stop_reason,
    });

    return {
      ...message,
      response: normalized,
    };
  }
}
