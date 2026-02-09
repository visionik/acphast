/**
 * Analyzed Combiner Node
 * Uses LLM to intelligently analyze and combine two inputs
 */

import Anthropic from '@anthropic-ai/sdk';
import { Observable, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Configuration for Analyzed Combiner
 */
export interface AnalyzedCombinerConfig extends Record<string, unknown> {
  /** Anthropic API key (falls back to ANTHROPIC_API_KEY env var) */
  apiKey?: string;

  /** Model to use for analysis (default: claude-sonnet-4-20250514) */
  model?: string;

  /** Custom prompt for the analyzer */
  analyzerPrompt?: string;
}

/**
 * Analyzed Combiner Node
 * 
 * Takes two inputs and uses an LLM to intelligently combine them.
 * The LLM analyzes both responses and produces a merged result.
 * 
 * Useful for:
 * - Comparing outputs from different models
 * - Creating a consensus from multiple backends
 * - Synthesizing information from parallel pipelines
 */
export class AnalyzedCombinerNode extends AcphastNode {
  static override meta = {
    name: 'Analyzed Combiner',
    category: 'routing' as const,
    description: 'LLM-based intelligent merge of two inputs',
    inputs: [
      {
        name: 'in1',
        type: 'pipeline' as const,
        label: 'Input 1',
        required: true,
      },
      {
        name: 'in2',
        type: 'pipeline' as const,
        label: 'Input 2',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Analyzed Result',
      },
    ],
  };

  private client?: Anthropic;

  constructor(config: AnalyzedCombinerConfig = {}) {
    super('Analyzed Combiner', config);

    this.addInput('in1', new ClassicPreset.Input(Sockets.pipeline, 'Input 1'));
    this.addInput('in2', new ClassicPreset.Input(Sockets.pipeline, 'Input 2'));
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Analyzed Result'));
  }

  /**
   * Get or create Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const config = this.config as AnalyzedCombinerConfig;
      this.client = new Anthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input1$ = inputs.in1?.[0];
    const input2$ = inputs.in2?.[0];

    if (!input1$ || !input2$) {
      this.logger?.warn('AnalyzedCombinerNode requires both inputs');
      return {};
    }

    // Wait for both inputs to complete, then analyze
    const combined$ = combineLatest([input1$, input2$]).pipe(
      switchMap(([msg1, msg2]) => this.analyzeAndCombine(msg1, msg2, ctx))
    );

    return { out: combined$ };
  }

  /**
   * Use LLM to analyze and combine two messages
   */
  private analyzeAndCombine(
    msg1: PipelineMessage,
    msg2: PipelineMessage,
    ctx: PipelineContext
  ): Observable<PipelineMessage> {
    return new Observable((subscriber) => {
      void (async () => {
        try {
          const config = this.config as AnalyzedCombinerConfig;
          const client = this.getClient();

          // Extract response content from both messages
          const response1 = this.extractContent(msg1);
          const response2 = this.extractContent(msg2);

          this.logger?.info('Analyzing and combining responses', {
            response1Length: response1.length,
            response2Length: response2.length,
          });

          // Build analyzer prompt
          const prompt = config.analyzerPrompt || 
            'You are analyzing two AI responses to the same query. ' +
            'Compare them and create a single, synthesized response that combines the best aspects of both. ' +
            'Be concise and comprehensive.';

          const userMessage = 
            `Response 1:\n${response1}\n\n` +
            `Response 2:\n${response2}\n\n` +
            `Please analyze these responses and provide a combined, improved answer.`;

          // Call LLM
          const stream = client.messages.stream({
            model: config.model || 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
              { role: 'user', content: userMessage },
            ],
            system: prompt,
          });

          let fullText = '';
          let stopReason: string | null = null;

          // Process stream
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
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
            } else if (event.type === 'message_delta') {
              stopReason = event.delta.stop_reason || stopReason;
            }
          }

          this.logger?.info('Analysis complete', {
            resultLength: fullText.length,
            stopReason,
          });

          // Build combined response
          const combinedMessage: PipelineMessage = {
            ...msg1, // Base on first message
            response: {
              content: [{ type: 'text', text: fullText }],
              stop_reason: stopReason,
              backend: 'analyzed-combiner',
            },
          };

          subscriber.next(combinedMessage);
          subscriber.complete();
        } catch (error) {
          this.logger?.error('Failed to analyze and combine', {
            error: error instanceof Error ? error.message : String(error),
          });
          subscriber.error(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  }

  /**
   * Extract text content from a pipeline message
   */
  private extractContent(msg: PipelineMessage): string {
    const response = msg.response as any;
    
    if (!response) {
      return '[No response]';
    }

    // Handle normalized response format
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .map((block: any) => block.text || '')
        .join('\n');
    }

    // Fallback
    return JSON.stringify(response);
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as AnalyzedCombinerConfig;

    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      errors.push('apiKey is required (or set ANTHROPIC_API_KEY env var)');
    }

    return errors;
  }

  /**
   * Lifecycle: Cleanup when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('Analyzed Combiner node removed');
    this.client = undefined;
  }
}
