/**
 * OpenAI Translator Node
 * Transforms ACP request params to OpenAI ChatCompletionCreateParams format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext, ACPRequest } from '@acphast/core';

/**
 * Configuration for OpenAI translator
 */
export interface OpenAITranslatorConfig extends Record<string, unknown> {
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
export interface OpenAITranslatedRequest {
  model: string;
  max_tokens?: number;
  temperature?: number;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
  top_p?: number;
  stop?: string | string[];
  user?: string;
}

/**
 * OpenAI Translator Node
 * 
 * Converts ACP request format to OpenAI ChatCompletionCreateParams.
 * Preserves OpenAI-specific features from _meta.
 */
export class OpenAITranslatorNode extends AcphastNode {
  static override meta = {
    name: 'OpenAI Translator',
    category: 'transform' as const,
    description: 'Convert ACP request to OpenAI format',
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

  constructor(config: OpenAITranslatorConfig = {}) {
    super('OpenAI Translator', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'ACP Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Translated Request'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('OpenAITranslatorNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.translate(message))
    );

    return { out: output$ };
  }

  /**
   * Translate ACP request to OpenAI format
   */
  private translate(message: PipelineMessage): PipelineMessage {
    const config = this.config as OpenAITranslatorConfig;
    const request = message.request as ACPRequest;
    const params = request.params as Record<string, unknown>;

    const translated: OpenAITranslatedRequest = {
      model: (params.model as string) || config.defaultModel || 'gpt-4',
      messages: (params.messages as Array<{ role: string; content: string }>) || [],
      stream: true, // Always stream
    };

    // Add optional parameters
    if (params.max_tokens !== undefined) {
      translated.max_tokens = params.max_tokens as number;
    } else if (config.defaultMaxTokens !== undefined) {
      translated.max_tokens = config.defaultMaxTokens;
    }

    if (params.temperature !== undefined) {
      translated.temperature = params.temperature as number;
    } else if (config.defaultTemperature !== undefined) {
      translated.temperature = config.defaultTemperature;
    }

    // Handle system message (OpenAI includes it in messages array)
    if (params.system) {
      translated.messages = [
        { role: 'system', content: params.system as string },
        ...translated.messages,
      ];
    }

    // Preserve OpenAI-specific features from _meta
    const meta = params._meta as Record<string, unknown> | undefined;
    const openaiMeta = meta?.openai as Record<string, unknown> | undefined;
    
    if (openaiMeta) {
      if (openaiMeta.frequency_penalty !== undefined) translated.frequency_penalty = openaiMeta.frequency_penalty as number;
      if (openaiMeta.presence_penalty !== undefined) translated.presence_penalty = openaiMeta.presence_penalty as number;
      if (openaiMeta.top_p !== undefined) translated.top_p = openaiMeta.top_p as number;
      if (openaiMeta.stop) translated.stop = openaiMeta.stop as string | string[];
      if (openaiMeta.user) translated.user = openaiMeta.user as string;
    }

    this.logger?.debug('Translated ACP to OpenAI format', {
      model: translated.model,
      messageCount: translated.messages.length,
    });

    return {
      ...message,
      translated,
      backend: 'openai',
    };
  }
}
