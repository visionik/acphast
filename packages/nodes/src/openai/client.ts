/**
 * OpenAI Client Node
 * Calls OpenAI API with streaming support
 */

import OpenAI from 'openai';
import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { StreamingNode } from '../base/streaming.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { OpenAITranslatedRequest } from './translator.js';

/**
 * Configuration for OpenAI client
 */
export interface OpenAIClientConfig extends Record<string, unknown> {
  /** OpenAI API key (falls back to OPENAI_API_KEY env var) */
  apiKey?: string;

  /** Organization ID */
  organization?: string;

  /** Base URL override (for proxies) */
  baseURL?: string;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Raw OpenAI response structure (stored in message.response)
 */
export interface OpenAIRawResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  id: string;
}

/**
 * OpenAI Client Node
 * 
 * Calls OpenAI API using the official SDK.
 * Expects message.translated to contain OpenAITranslatedRequest.
 * Streams responses via ctx.onUpdate.
 */
export class OpenAIClientNode extends StreamingNode {
  static override meta = {
    name: 'OpenAI Client',
    category: 'adapter' as const,
    description: 'Call OpenAI API with streaming',
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

  private client?: OpenAI;

  constructor(config: OpenAIClientConfig = {}) {
    super('OpenAI Client', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Translated Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Raw Response'));
  }

  /**
   * Get or create OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const config = this.config as OpenAIClientConfig;
      this.client = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        organization: config.organization,
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
      const translated = message.translated as OpenAITranslatedRequest;

      if (!translated) {
        subscriber.error(new Error('No translated request found. Connect OpenAITranslator first.'));
        return;
      }

      this.logger?.info('OpenAI client calling API', {
        model: translated.model,
        messageCount: translated.messages.length,
      });

      void this.callApi(translated, ctx, message, subscriber);

      return () => {
        this.logger?.debug('OpenAI stream subscription cancelled');
      };
    });
  }

  /**
   * Call OpenAI API and handle streaming
   */
  private async callApi(
    params: OpenAITranslatedRequest,
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

      // Create streaming completion
      const stream = await client.chat.completions.create({
        ...params,
        stream: true,
      } as OpenAI.Chat.ChatCompletionCreateParams) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

      let fullText = '';
      let finishReason: string | null = null;
      let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
      let messageId = '';
      let model = params.model;

      // Process stream chunks
      for await (const chunk of stream) {
        messageId = chunk.id;
        model = chunk.model;

        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullText += delta.content;

          // Send streaming update
          if (ctx.onUpdate) {
            await ctx.onUpdate({
              method: 'session/update',
              params: {
                sessionId: ctx.sessionId,
                update: {
                  type: 'content_chunk',
                  content: { type: 'text', text: delta.content },
                },
              },
            });
          }
        }

        // Capture finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // Capture usage (final chunk)
        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          };
        }
      }

      this.logger?.info('OpenAI response complete', {
        finishReason,
        textLength: fullText.length,
      });

      // Build raw response
      const response: OpenAIRawResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: fullText,
            },
            finish_reason: finishReason,
            index: 0,
          },
        ],
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
      this.logger?.error('OpenAI API error', {
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
    const config = this.config as OpenAIClientConfig;

    if (!config.apiKey && !process.env.OPENAI_API_KEY) {
      errors.push('apiKey is required (or set OPENAI_API_KEY env var)');
    }

    return errors;
  }

  /**
   * Lifecycle: Cleanup when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('OpenAI client node removed');
    this.client = undefined;
  }
}
