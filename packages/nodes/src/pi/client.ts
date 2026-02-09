/**
 * Pi Client Node
 * Spawns and manages Pi RPC process, handles event streaming
 */

import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { StreamingNode } from '../base/streaming.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import { PiRpcClient } from './rpc-client.js';
import type { PiRpcEvent, PiTranslatedRequest } from './index.js';

/**
 * Configuration for Pi client
 */
export interface PiClientConfig extends Record<string, unknown> {
  /** Working directory (default: process.cwd()) */
  cwd?: string;

  /** Pi command override */
  piCommand?: string;

  /** Session file path */
  sessionPath?: string;

  /** Auto-spawn on first message (default: true) */
  autoSpawn?: boolean;
}

/**
 * Raw Pi response structure (stored in message.response)
 */
export interface PiRawResponse {
  /** All events received */
  events: PiRpcEvent[];

  /** Accumulated text */
  fullText: string;

  /** Stop reason */
  stopReason: string | null;

  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Pi Client Node
 * 
 * Spawns Pi RPC process, sends prompts, and streams events.
 * Manages process lifecycle and event-to-ACP mapping.
 */
export class PiClientNode extends StreamingNode {
  static override meta = {
    name: 'Pi Client',
    category: 'adapter' as const,
    description: 'Call Pi CLI with streaming',
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

  private client?: PiRpcClient;
  private spawning = false;

  constructor(config: PiClientConfig = {}) {
    super('Pi Client', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Translated Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Raw Response'));
  }

  /**
   * Get or spawn Pi client
   */
  private async getClient(): Promise<PiRpcClient> {
    const config = this.config as PiClientConfig;

    // Return existing client if available and alive
    if (this.client && this.client.isAlive()) {
      return this.client;
    }

    // Wait if already spawning
    while (this.spawning) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Double-check after waiting
    if (this.client && this.client.isAlive()) {
      return this.client;
    }

    // Spawn new client
    this.spawning = true;
    try {
      this.logger?.info('Spawning Pi RPC process', {
        cwd: config.cwd,
        sessionPath: config.sessionPath,
      });

      this.client = await PiRpcClient.spawn({
        cwd: config.cwd || process.cwd(),
        piCommand: config.piCommand,
        sessionPath: config.sessionPath,
      });

      this.logger?.info('Pi RPC process spawned successfully');
      return this.client;
    } finally {
      this.spawning = false;
    }
  }

  /**
   * Process streaming request
   */
  processStream(
    message: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage> {
    return new Observable((subscriber) => {
      const translated = message.translated as PiTranslatedRequest;

      if (!translated) {
        subscriber.error(new Error('No translated request found. Connect PiTranslator first.'));
        return;
      }

      this.logger?.info('Pi client processing request', {
        messageLength: translated.message.length,
        attachmentCount: translated.attachments.length,
      });

      void this.executePrompt(translated, ctx, message, subscriber);

      return () => {
        this.logger?.debug('Pi stream subscription cancelled');
      };
    });
  }

  /**
   * Execute prompt and handle streaming
   */
  private async executePrompt(
    translated: PiTranslatedRequest,
    ctx: PipelineContext,
    originalMessage: PipelineMessage,
    subscriber: {
      next: (value: PipelineMessage) => void;
      error: (err: Error) => void;
      complete: () => void;
    }
  ): Promise<void> {
    try {
      const client = await this.getClient();

      // Apply model settings if specified
      if (translated.model) {
        this.logger?.debug('Setting Pi model', translated.model);
        await client.setModel(translated.model.provider, translated.model.modelId);
      }

      // Apply thinking level if specified
      if (translated.thinkingLevel) {
        this.logger?.debug('Setting Pi thinking level', { level: translated.thinkingLevel });
        await client.setThinkingLevel(translated.thinkingLevel);
      }

      // Setup event accumulation
      const events: PiRpcEvent[] = [];
      let fullText = '';
      let stopReason: string | null = null;
      let usage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;

      // Register event handler
      const cleanup = client.onEvent((event) => {
        events.push(event);

        // Handle different event types
        if (event.type === 'text_chunk' && typeof event.text === 'string') {
          fullText += event.text;

          // Stream text chunk to client
          if (ctx.onUpdate) {
            void ctx.onUpdate({
              method: 'session/update',
              params: {
                sessionId: ctx.sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: event.text },
                },
              },
            });
          }
        } else if (event.type === 'thinking_chunk' && typeof event.text === 'string') {
          // Stream thinking chunk
          if (ctx.onUpdate) {
            void ctx.onUpdate({
              method: 'session/update',
              params: {
                sessionId: ctx.sessionId,
                update: {
                  sessionUpdate: 'thinking_chunk',
                  content: { type: 'thinking', text: event.text },
                },
              },
            });
          }
        } else if (event.type === 'generation_complete') {
          stopReason = (event.stopReason as string) || 'end_turn';
          
          if (event.usage && typeof event.usage === 'object') {
            const usageObj = event.usage as {
              inputTokens?: number;
              outputTokens?: number;
            };
            usage = {
              inputTokens: usageObj.inputTokens || 0,
              outputTokens: usageObj.outputTokens || 0,
              totalTokens: (usageObj.inputTokens || 0) + (usageObj.outputTokens || 0),
            };
          }
        }
      });

      // Send prompt
      try {
        await client.prompt(translated.message, translated.attachments);

        // Wait a bit for final events to arrive
        await new Promise((resolve) => setTimeout(resolve, 100));

        this.logger?.info('Pi response complete', {
          stopReason,
          textLength: fullText.length,
          eventCount: events.length,
        });

        // Build raw response
        const response: PiRawResponse = {
          events,
          fullText,
          stopReason,
          usage,
        };

        // Emit final message
        subscriber.next({
          ...originalMessage,
          response,
        });

        subscriber.complete();
      } finally {
        // Clean up event handler
        cleanup();
      }
    } catch (error) {
      this.logger?.error('Pi client error', {
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
    const config = this.config as PiClientConfig;

    // Validate cwd if provided
    if (config.cwd && typeof config.cwd !== 'string') {
      errors.push('cwd must be a string');
    }

    return errors;
  }

  /**
   * Lifecycle: Cleanup when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('Pi client node removed, terminating process');
    
    if (this.client) {
      void this.client.terminate();
      this.client = undefined;
    }
  }
}
