#!/usr/bin/env node

/**
 * Acphast CLI
 * Main entry point for the Acphast server
 */

import { StdioTransport, HttpTransport } from '@acphast/transport';
import { NodeRegistry } from '@acphast/nodes';
import { ACPPassthroughNode, AnthropicAdapterNode } from '@acphast/nodes';
import { AcphastEngine } from '@acphast/engine';
import { ConsoleLogger, LogLevel } from './logger.js';
import { JsonRpcErrorCode } from '@acphast/transport';
import type { ACPRequest, PipelineMessage, PipelineContext } from '@acphast/core';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';

/**
 * Main server class
 */
class AcphastServer {
  private transport: StdioTransport | HttpTransport;
  private engine: AcphastEngine;
  private registry: NodeRegistry;
  private logger: ConsoleLogger;
  private useHttp: boolean;

  constructor() {
    // Initialize logger
    const logLevel = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
    this.logger = new ConsoleLogger(logLevel);

    // Check if HTTP mode
    this.useHttp = process.env.TRANSPORT === 'http' || process.argv.includes('--http');

    // Initialize node registry
    this.registry = new NodeRegistry();
    
    // Register built-in nodes
    this.registry.register(ACPPassthroughNode as any);
    this.registry.register(AnthropicAdapterNode as any);
    
    this.logger.info('Registered nodes', {
      nodes: this.registry.list(),
    });

    // Initialize engine
    this.engine = new AcphastEngine({
      registry: this.registry,
      logger: this.logger,
    });

    // Initialize transport
    if (this.useHttp) {
      const port = parseInt(process.env.PORT || '6809', 10);
      this.transport = new HttpTransport({
        port,
        host: 'localhost',
        logger: this.logger,
      });
    } else {
      this.transport = new StdioTransport({
        logger: this.logger,
      });
    }

    // Set up request handler
    this.transport.requests$.subscribe({
      next: (request) => void this.handleRequest(request),
      error: (err) => this.logger.error('Transport error', { error: String(err) }),
      complete: () => this.logger.info('Transport completed'),
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    this.logger.info('Starting Acphast server');

    // Load default graph
    await this.loadDefaultGraph();

    // Start transport
    await this.transport.start();

    this.logger.info('Acphast server ready');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Acphast server');
    await this.transport.stop();
    this.logger.info('Acphast server stopped');
  }

  /**
   * Load default graph
   */
  private async loadDefaultGraph(): Promise<void> {
    // Create graph with Anthropic adapter for actual LLM responses
    const graph = {
      version: '1.0.0',
      metadata: {
        name: 'Default Anthropic',
        description: 'Anthropic Claude adapter',
      },
      nodes: [
        {
          id: 'anthropic',
          type: 'Anthropic Adapter',
          label: 'Anthropic Adapter',
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            defaultModel: 'claude-sonnet-4-20250514',
            maxTokens: 4096,
          },
        },
      ],
      connections: [],
    };

    await this.engine.loadGraph(graph);
    this.logger.info('Loaded default graph');
  }

  /**
   * Handle incoming JSON-RPC request
   */
  private async handleRequest(request: any): Promise<void> {
    this.logger.debug('Handling request', { method: request.method, id: request.id });

    try {
      // Check if this is an ACP request
      if (!request.method.startsWith('acp/')) {
        await this.transport.sendError({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.MethodNotFound,
            message: `Method not found: ${request.method}`,
          },
          id: request.id,
        });
        return;
      }

      // Build ACP request from JSON-RPC envelope
      // The JSON-RPC method becomes the ACP method, and params become ACP params
      const acpRequest: ACPRequest = {
        id: request.id,
        method: request.method,
        params: request.params || {},
      };
      
      // Create pipeline context
      const ctx: PipelineContext = {
        requestId: randomUUID(),
        sessionId: (request.params as any)?.sessionId,
        startTime: Date.now(),
        meta: {},
        logger: this.logger.child({ requestId: randomUUID() }),
        onUpdate: async (notification) => {
          // Send streaming updates as JSON-RPC notifications
          // Use the original request.id for SSE routing so clients can connect
          await this.transport.sendNotification({
            jsonrpc: '2.0',
            method: 'acp/notification',
            params: {
              ...notification,
              requestId: String(request.id),
            },
          });
        },
      };

      // Create pipeline message
      const message: PipelineMessage = {
        ctx,
        request: acpRequest,
      };

      this.logger.info('Processing request through graph', {
        method: acpRequest.method,
        requestId: ctx.requestId,
      });

      // Execute through graph
      const result$ = await this.engine.execute('anthropic', message, ctx);

      // Wait for result with timeout
      const result = await firstValueFrom(result$.pipe(timeout(30000)));

      // Send response
      await this.transport.sendResponse({
        jsonrpc: '2.0',
        result: result.response || {
          content: [{ type: 'text', text: 'Processing completed' }],
        },
        id: request.id,
      });
    } catch (err) {
      this.logger.error('Error handling request', {
        error: err instanceof Error ? err.message : String(err),
      });

      await this.transport.sendError({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.InternalError,
          message: 'Internal error',
          data: err instanceof Error ? err.message : String(err),
        },
        id: request.id,
      });
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = new AcphastServer();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  // Start server
  await server.start();
}

// Run
void main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
