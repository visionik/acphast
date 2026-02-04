/**
 * Anthropic Client Node
 * Calls Anthropic API with streaming support
 */

import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { StreamingNode } from '../base/streaming.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { AnthropicTranslatedRequest } from './translator.js';

/**
 * Configuration for Anthropic client
 */
export interface AnthropicClientConfig extends Record<string, unknown> {
  /** Anthropic API key (falls back to ANTHROPIC_API_KEY env var) */
  apiKey?: string;

  /** Base URL override (for proxies) */
  baseURL?: string;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Raw Anthropic response structure (stored in message.response)
 */
export interface AnthropicRawResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  } | null;
  model: string;
  id: string;
}

/**
 * Anthropic Client Node
 * 
 * Calls Anthropic API using the SDK.
 * Expects message.translated to contain AnthropicTranslatedRequest.
 * Streams responses via ctx.onUpdate.
 */
export class AnthropicClientNode extends StreamingNode {
  static override meta = {
    name: 'Anthropic Client',
    category: 'adapter' as const,
    description: 'Call Anthropic API with streaming',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'Translated Request',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Raw Response',
      },
    ],
  };

  private client?: Anthropic;

  constructor(config: AnthropicClientConfig = {}) {
    super('Anthropic Client', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Translated Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Raw Response'));
  }

  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const config = this.config as AnthropicClientConfig;
      this.client = new Anthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: config.baseURL,
        timeout: config.timeout,
      });
    }
    return this.client;
  }

  /**
   * Process streaming request
   */
  processStream(
    message: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage> {
    return new Observable((subscriber) => {
      const translated = message.translated as AnthropicTranslatedRequest;

      if (!translated) {
        subscriber.error(new Error('No translated request found. Connect AnthropicTranslator first.'));
        return;
      }

      this.logger?.info('Anthropic client calling API', {
        model: translated.model,
        messageCount: translated.messages.length,
      });

      void this.callApi(translated, ctx, message, subscriber);

      return () => {
        this.logger?.debug('Anthropic stream subscription cancelled');
      };
    });
  }

  /**
   * Call Anthropic API and handle streaming
   */
  private async callApi(
    params: AnthropicTranslatedRequest,
    ctx: PipelineContext,
    originalMessage: PipelineMessage,
    subscriber: {
      next: (value: PipelineMessage) => void;
      error: (err: Error) => void;
      complete: () => void;
    }
  ): Promise<void> {
    try {
      const client = this.getClient();

      // Create streaming message
      const stream = client.messages.stream(params as Anthropic.MessageCreateParams);

      let fullText = '';
      let stopReason: string | null = null;
      let usage: { input_tokens: number; output_tokens: number } | null = null;
      let messageId = '';
      let model = params.model;

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'message_start') {
          usage = event.message.usage as { input_tokens: number; output_tokens: number };
          messageId = event.message.id;
          model = event.message.model;
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text;

            // Send streaming update
            if (ctx.onUpdate) {
              await ctx.onUpdate({
                method: 'session/update',
                params: {
                  sessionId: ctx.sessionId,
                  update: {
                    type: 'content_chunk',
                    content: { type: 'text', text: event.delta.text },
                  },
                },
              });
            }
          }
        } else if (event.type === 'message_delta') {
          stopReason = event.delta.stop_reason || stopReason;
          if (event.usage) {
            usage = { ...usage!, ...event.usage };
          }
        } else if (event.type === 'message_stop') {
          this.logger?.info('Anthropic response complete', {
            stopReason,
            textLength: fullText.length,
          });
        }
      }

      // Build raw response
      const response: AnthropicRawResponse = {
        content: [{ type: 'text', text: fullText }],
        stop_reason: stopReason,
        usage,
        model,
        id: messageId,
      };

      // Emit final message
      subscriber.next({
        ...originalMessage,
        response,
      });

      subscriber.complete();
    } catch (error) {
      this.logger?.error('Anthropic API error', {
        error: error instanceof Error ? error.message : String(error),
      });

      subscriber.error(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as AnthropicClientConfig;

    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      errors.push('apiKey is required (or set ANTHROPIC_API_KEY env var)');
    }

    return errors;
  }

  /**
   * Lifecycle: Cleanup when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('Anthropic client node removed');
    this.client = undefined;
  }
}
