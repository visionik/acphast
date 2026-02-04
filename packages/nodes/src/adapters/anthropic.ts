/**
 * Anthropic Adapter Node
 * Translates ACP messages to Anthropic API calls with streaming
 */

import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { StreamingNode } from '../base/streaming.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext, ACPRequest } from '@acphast/core';

/**
 * Configuration for Anthropic adapter
 */
export interface AnthropicConfig extends Record<string, unknown> {
  /** Anthropic API key */
  apiKey: string;

  /** Default model to use */
  defaultModel?: string;

  /** Max tokens */
  maxTokens?: number;

  /** Temperature */
  temperature?: number;
}

/**
 * Anthropic Adapter Node
 * 
 * Connects to Claude models via Anthropic API
 * - Translates ACP requests to Anthropic format
 * - Handles streaming responses
 * - Preserves Anthropic-specific features in metadata
 */
export class AnthropicAdapterNode extends StreamingNode {
  static override meta = {
    name: 'Anthropic Adapter',
    category: 'adapter' as const,
    description: 'Connect to Claude models via Anthropic API',
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
        label: 'ACP Response',
      },
    ],
  };

  private client?: Anthropic;

  constructor(config: AnthropicConfig = { apiKey: '' }) {
    super('Anthropic Adapter', config);

    // Add ports
    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'ACP Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'ACP Response'));
  }

  /**
   * Initialize Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const config = this.config as unknown as AnthropicConfig;
      this.client = new Anthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  /**
   * Process a single message through Anthropic API
   */
  processStream(
    message: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage> {
    return new Observable((subscriber) => {
      const config = this.config as unknown as AnthropicConfig;
      const request = message.request as ACPRequest;

      this.logger?.info('Anthropic adapter processing message', {
        method: request.method,
        model: (request.params as any).model || config.defaultModel,
      });

      // Translate ACP request to Anthropic format
      const anthropicRequest = this.translateRequest(request, config);

      // Call Anthropic API with streaming
      void this.callAnthropic(anthropicRequest, ctx, message, subscriber);

      return () => {
        // Cleanup if subscription is cancelled
        this.logger?.debug('Anthropic stream cancelled');
      };
    });
  }

  /**
   * Translate ACP request to Anthropic format
   */
  private translateRequest(request: ACPRequest, config: AnthropicConfig): Anthropic.MessageCreateParams {
    const params = request.params as any;

    return {
      model: params.model || config.defaultModel || 'claude-sonnet-4-20250514',
      max_tokens: params.max_tokens || config.maxTokens || 4096,
      temperature: params.temperature ?? config.temperature,
      messages: params.messages || [],
      system: params.system,
      // Preserve Anthropic-specific features
      metadata: params._meta?.anthropic?.metadata,
      stop_sequences: params._meta?.anthropic?.stop_sequences,
      top_p: params._meta?.anthropic?.top_p,
      top_k: params._meta?.anthropic?.top_k,
      stream: true, // Always stream
    } as Anthropic.MessageCreateParams;
  }

  /**
   * Call Anthropic API and handle streaming
   */
  private async callAnthropic(
    params: Anthropic.MessageCreateParams,
    ctx: PipelineContext,
    originalMessage: PipelineMessage,
    subscriber: any
  ): Promise<void> {
    try {
      const client = this.getClient();

      // Create streaming message
      const stream = client.messages.stream(params);

      let fullText = '';
      let stopReason: string | null = null;
      let usage: any = null;

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'message_start') {
          // Message started
          usage = event.message.usage;
        } else if (event.type === 'content_block_delta') {
          // Content delta
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
          // Message delta (stop reason, usage)
          stopReason = event.delta.stop_reason || stopReason;
          if (event.usage) {
            usage = { ...usage, ...event.usage };
          }
        } else if (event.type === 'message_stop') {
          // Message complete
          this.logger?.info('Anthropic response complete', {
            stopReason,
            textLength: fullText.length,
          });
        }
      }

      // Build final response
      const response: any = {
        content: [{ type: 'text', text: fullText }],
        stop_reason: stopReason,
        usage,
      };

      // Emit final message
      subscriber.next({
        ...originalMessage,
        response,
        backend: 'anthropic',
      });

      subscriber.complete();
    } catch (error) {
      this.logger?.error('Anthropic API error', {
        error: error instanceof Error ? error.message : String(error),
      });

      subscriber.error(error);
    }
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as unknown as AnthropicConfig;

    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      errors.push('apiKey is required (or set ANTHROPIC_API_KEY env var)');
    }

    return errors;
  }

  /**
   * Lifecycle: Initialize client when node is added
   */
  override onAdded(): void {
    this.logger?.info('Anthropic adapter node added');
    // Client is lazily initialized on first use
  }

  /**
   * Lifecycle: Cleanup when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('Anthropic adapter node removed');
    this.client = undefined;
  }
}
