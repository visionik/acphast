/**
 * ACP Passthrough Adapter Node
 * Forwards ACP messages to another ACP agent without translation
 */

import { Observable } from 'rxjs';
import { ClassicPreset } from 'rete';
import { AcphastNode } from '../base/node.js';
import { Sockets } from '../sockets.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';

/**
 * Configuration for ACP passthrough adapter
 */
export interface ACPPassthroughConfig extends Record<string, unknown> {
  /** Endpoint URL or command for the target ACP agent */
  endpoint: string;

  /** Connection type */
  type: 'stdio' | 'http' | 'websocket';

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * ACP Passthrough Adapter Node
 * 
 * This is the simplest adapter - it forwards messages to another
 * ACP agent without any translation. Useful for:
 * - Testing the pipeline
 * - Chaining multiple Acphast instances
 * - Proxying to ACP-native backends
 */
export class ACPPassthroughNode extends AcphastNode {
  static override meta = {
    name: 'ACP Passthrough',
    category: 'adapter' as const,
    description: 'Forward messages to another ACP agent without translation',
    inputs: [
      {
        name: 'in',
        type: 'pipeline' as const,
        label: 'Input',
        required: true,
      },
    ],
    outputs: [
      {
        name: 'out',
        type: 'pipeline' as const,
        label: 'Output',
      },
    ],
  };

  constructor(config: ACPPassthroughConfig = { endpoint: '', type: 'stdio' }) {
    super('ACP Passthrough', config);

    // Add input port
    this.addInput('in', new ClassicPreset.Input(Sockets.pipeline, 'Input'));

    // Add output port
    this.addOutput('out', new ClassicPreset.Output(Sockets.pipeline, 'Output'));
  }

  process(
    inputs: Record<string, Observable<PipelineMessage>[]>,
    _ctx: PipelineContext
  ): Record<string, Observable<PipelineMessage>> {
    const input$ = inputs.in?.[0];

    if (!input$) {
      this.logger?.warn('ACPPassthroughNode received no input');
      return {};
    }

    // For now, just pass through the message unchanged
    // In a full implementation, this would:
    // 1. Connect to the target ACP agent
    // 2. Forward the request
    // 3. Stream back the response
    // 4. Handle errors and retries

    this.logger?.debug('ACPPassthrough forwarding message', {
      endpoint: this.config.endpoint,
      type: this.config.type,
    });

    // Simple passthrough for now
    // TODO: Implement actual ACP client connection
    return { out: input$ };
  }

  /**
   * Validate configuration
   */
  override validate(): string[] {
    const errors = super.validate();
    const config = this.config as unknown as ACPPassthroughConfig;

    if (!config.endpoint) {
      errors.push('endpoint is required');
    }

    if (!config.type || !['stdio', 'http', 'websocket'].includes(config.type)) {
      errors.push('type must be one of: stdio, http, websocket');
    }

    return errors;
  }

  /**
   * Lifecycle: Initialize connection when node is added
   */
  override onAdded(): void {
    this.logger?.info('ACPPassthrough node added', {
      endpoint: this.config.endpoint,
    });
    // TODO: Initialize connection to target agent
  }

  /**
   * Lifecycle: Close connection when node is removed
   */
  override onRemoved(): void {
    this.logger?.info('ACPPassthrough node removed');
    // TODO: Close connection to target agent
  }
}
