/**
 * Anthropic Translator Node
 * Transforms ACP request params to Anthropic MessageCreateParams format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext, ACPRequest } from '@acphast/core';

/**
 * Configuration for Anthropic translator
 */
export interface AnthropicTranslatorConfig extends Record<string, unknown> {
  /** Default model to use if not specified in request */
  defaultModel?: string;

  /** Default max tokens */
  defaultMaxTokens?: number;

  /** Default temperature */
  defaultTemperature?: number;
}

/**
 * Translated request structure (stored in message.translated)
 */
export interface AnthropicTranslatedRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  metadata?: unknown;
  stop_sequences?: string[];
  top_p?: number;
  top_k?: number;
  stream: boolean;
}

/**
 * Anthropic Translator Node
 * 
 * Converts ACP request format to Anthropic MessageCreateParams.
 * Preserves Anthropic-specific features from _meta.
 */
export class AnthropicTranslatorNode extends AcphastNode {
  static override meta = {
    name: 'Anthropic Translator',
    category: 'transform' as const,
    description: 'Convert ACP request to Anthropic format',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'ACP Request',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Translated Request',
      },
    ],
  };

  constructor(config: AnthropicTranslatorConfig = {}) {
    super('Anthropic Translator', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'ACP Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Translated Request'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('AnthropicTranslatorNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.translate(message))
    );

    return { out: output$ };
  }

  /**
   * Translate ACP request to Anthropic format
   */
  private translate(message: PipelineMessage): PipelineMessage {
    const config = this.config as AnthropicTranslatorConfig;
    const request = message.request as ACPRequest;
    const params = request.params as Record<string, unknown>;

    const translated: AnthropicTranslatedRequest = {
      model: (params.model as string) || config.defaultModel || 'claude-sonnet-4-20250514',
      max_tokens: (params.max_tokens as number) || config.defaultMaxTokens || 4096,
      temperature: (params.temperature as number) ?? config.defaultTemperature,
      messages: (params.messages as Array<{ role: string; content: string }>) || [],
      system: params.system as string | undefined,
      stream: true, // Always stream
    };

    // Preserve Anthropic-specific features from _meta
    const meta = params._meta as Record<string, unknown> | undefined;
    const anthropicMeta = meta?.anthropic as Record<string, unknown> | undefined;
    
    if (anthropicMeta) {
      if (anthropicMeta.metadata) translated.metadata = anthropicMeta.metadata;
      if (anthropicMeta.stop_sequences) translated.stop_sequences = anthropicMeta.stop_sequences as string[];
      if (anthropicMeta.top_p !== undefined) translated.top_p = anthropicMeta.top_p as number;
      if (anthropicMeta.top_k !== undefined) translated.top_k = anthropicMeta.top_k as number;
    }

    this.logger?.debug('Translated ACP to Anthropic format', {
      model: translated.model,
      messageCount: translated.messages.length,
    });

    return {
      ...message,
      translated,
      backend: 'anthropic',
    };
  }
}
