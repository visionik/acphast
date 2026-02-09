/**
 * Pi Translator Node
 * Transforms ACP request params to Pi RPC format
 */

import { Observable, map } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
import type { ThinkingLevel, PiModel } from './types.js';

/**
 * Configuration for Pi translator
 */
export interface PiTranslatorConfig extends Record<string, unknown> {
  /** Default thinking level */
  defaultThinkingLevel?: ThinkingLevel;

  /** Default model provider */
  defaultProvider?: string;

  /** Default model ID */
  defaultModel?: string;
}

/**
 * Translated request structure (stored in message.translated)
 */
export interface PiTranslatedRequest {
  /** Prompt message text */
  message: string;

  /** Attachments (images, files, etc.) */
  attachments: unknown[];

  /** Thinking level */
  thinkingLevel?: ThinkingLevel;

  /** Model selection */
  model?: PiModel;
}

/**
 * Pi Translator Node
 * 
 * Converts ACP request format to Pi RPC format.
 * Extracts message text, attachments, and Pi-specific configuration.
 */
export class PiTranslatorNode extends AcphastNode {
  static override meta = {
    name: 'Pi Translator',
    category: 'transform' as const,
    description: 'Convert ACP request to Pi RPC format',
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

  constructor(config: PiTranslatorConfig = {}) {
    super('Pi Translator', config);

    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'ACP Request'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Translated Request'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('PiTranslatorNode received no input');
      return {};
    }

    const output$ = input$.pipe(
      map((message) => this.translate(message))
    );

    return { out: output$ };
  }

  /**
   * Translate ACP request to Pi RPC format
   */
  private translate(message: PipelineMessage): PipelineMessage {
    const config = this.config as PiTranslatorConfig;
    const request = message.request;
    const params = request.params as Record<string, unknown>;

    // Extract prompt content
    const prompt = params.prompt as Array<{ type: string; text?: string; [key: string]: unknown }> | undefined;
    let messageText = '';
    const attachments: unknown[] = [];

    if (prompt && Array.isArray(prompt)) {
      for (const part of prompt) {
        if (part.type === 'text' && part.text) {
          messageText += part.text;
        } else if (part.type === 'image' || part.type === 'file') {
          // Collect non-text attachments
          attachments.push(part);
        }
      }
    }

    // Extract Pi-specific configuration from _meta
    const meta = params._meta as Record<string, unknown> | undefined;
    const piMeta = meta?.pi as Record<string, unknown> | undefined;

    // Build translated request
    const translated: PiTranslatedRequest = {
      message: messageText.trim(),
      attachments,
    };

    // Apply thinking level (piMeta takes precedence over config defaults)
    if (piMeta?.thinkingLevel) {
      translated.thinkingLevel = piMeta.thinkingLevel as ThinkingLevel;
    } else if (config.defaultThinkingLevel) {
      translated.thinkingLevel = config.defaultThinkingLevel;
    }

    // Apply model selection
    if (piMeta?.model && typeof piMeta.model === 'object') {
      const modelObj = piMeta.model as { provider?: string; modelId?: string };
      if (modelObj.provider && modelObj.modelId) {
        translated.model = {
          provider: modelObj.provider,
          modelId: modelObj.modelId,
        };
      }
    } else if (config.defaultProvider && config.defaultModel) {
      translated.model = {
        provider: config.defaultProvider,
        modelId: config.defaultModel,
      };
    }

    this.logger?.debug('Translated ACP to Pi RPC format', {
      messageLength: translated.message.length,
      attachmentCount: translated.attachments.length,
      thinkingLevel: translated.thinkingLevel,
      model: translated.model,
    });

    return {
      ...message,
      translated,
      backend: 'pi',
    };
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as PiTranslatorConfig;

    // Validate thinking level if provided
    const validThinkingLevels: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    if (config.defaultThinkingLevel && !validThinkingLevels.includes(config.defaultThinkingLevel)) {
      errors.push(`Invalid defaultThinkingLevel: ${config.defaultThinkingLevel}`);
    }

    // Validate model config (both provider and modelId must be provided together)
    if ((config.defaultProvider && !config.defaultModel) || (!config.defaultProvider && config.defaultModel)) {
      errors.push('defaultProvider and defaultModel must both be specified or both omitted');
    }

    return errors;
  }
}
