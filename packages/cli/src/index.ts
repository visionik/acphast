#!/usr/bin/env node

/**
 * Acphast CLI
 * Main entry point for the Acphast server
 */

import { StdioTransport, HttpTransport, PiRpcTransport } from '@acphast/transport';
import { NodeRegistry } from '@acphast/nodes';
import {
  ACPPassthroughNode,
  AnthropicAdapterNode,
  AnthropicTranslatorNode,
  AnthropicClientNode,
  ResponseNormalizerNode,
} from '@acphast/nodes';
import { AcphastEngine } from '@acphast/engine';
import { MemorySessionRepository } from '@acphast/session';
import { ConsoleLogger, LogLevel } from './logger.js';
import { JsonRpcErrorCode } from '@acphast/transport';
import type { ACPRequest, PipelineMessage, PipelineContext, Session } from '@acphast/core';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';

/** Maximum messages to keep in history (sliding window) */
const MAX_HISTORY_MESSAGES = 20;

/**
 * Main server class
 */
class AcphastServer {
  private transport: StdioTransport | HttpTransport | PiRpcTransport;
  private engine: AcphastEngine;
  private registry: NodeRegistry;
  private logger: ConsoleLogger;
  private useHttp: boolean;
  private usePiRpc: boolean;
  private sessions: MemorySessionRepository;

  constructor() {
    // Initialize logger
    const logLevel = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
    this.logger = new ConsoleLogger(logLevel);

    // Check transport mode
    this.useHttp = process.env.TRANSPORT === 'http' || process.argv.includes('--http');
    this.usePiRpc = process.env.TRANSPORT === 'pi-rpc' || process.argv.includes('--pi-rpc');

    // Initialize node registry
    this.registry = new NodeRegistry();
    
    // Register built-in nodes
    this.registry.register(ACPPassthroughNode as any);
    this.registry.register(AnthropicAdapterNode as any);
    // Anthropic pipeline nodes
    this.registry.register(AnthropicTranslatorNode as any);
    this.registry.register(AnthropicClientNode as any);
    this.registry.register(ResponseNormalizerNode as any);
    
    this.logger.info('Registered nodes', {
      nodes: this.registry.list(),
    });

    // Initialize engine
    this.engine = new AcphastEngine({
      registry: this.registry,
      logger: this.logger,
    });

    // Initialize session repository
    this.sessions = new MemorySessionRepository({
      maxSessions: 100,
      ttl: 60 * 60 * 1000, // 1 hour
    });

    // Initialize transport
    if (this.usePiRpc) {
      this.transport = new PiRpcTransport({
        logger: this.logger,
      });
    } else if (this.useHttp) {
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
    // Create graph with disaggregated Anthropic pipeline:
    // Translator -> Client -> Normalizer
    const graph = {
      version: '1.0.0',
      metadata: {
        name: 'Anthropic Pipeline',
        description: 'Disaggregated Anthropic adapter pipeline',
      },
      nodes: [
        {
          id: 'translator',
          type: 'Anthropic Translator',
          label: 'ACP → Anthropic',
          config: {
            defaultModel: 'claude-sonnet-4-20250514',
            defaultMaxTokens: 4096,
          },
        },
        {
          id: 'client',
          type: 'Anthropic Client',
          label: 'Anthropic API',
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY || '',
          },
        },
        {
          id: 'normalizer',
          type: 'Response Normalizer',
          label: 'Normalize Response',
          config: {},
        },
      ],
      connections: [
        {
          source: 'translator',
          sourceOutput: 'out',
          target: 'client',
          targetInput: 'in',
        },
        {
          source: 'client',
          sourceOutput: 'out',
          target: 'normalizer',
          targetInput: 'in',
        },
      ],
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

      // Handle session/new separately
      if (request.method === 'acp/session/new') {
        await this.handleSessionNew(request);
        return;
      }

      // Handle messages/create with session support
      if (request.method === 'acp/messages/create') {
        await this.handleMessagesCreate(request);
        return;
      }

      // Unknown ACP method
      await this.transport.sendError({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.MethodNotFound,
          message: `Unknown ACP method: ${request.method}`,
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

  /**
   * Handle acp/session/new - create a new conversation session
   */
  private async handleSessionNew(request: any): Promise<void> {
    const session = await this.sessions.create({
      history: [],
      metadata: request.params || {},
    });

    this.logger.info('Created new session', { sessionId: session.id });

    await this.transport.sendResponse({
      jsonrpc: '2.0',
      result: { sessionId: session.id },
      id: request.id,
    });
  }

  /**
   * Handle acp/messages/create - send a message with conversation history
   */
  private async handleMessagesCreate(request: any): Promise<void> {
    const params = request.params || {};
    let sessionId = params.sessionId as string | undefined;
    let session: Session | null = null;

    // Get or create session
    if (sessionId) {
      session = await this.sessions.get(sessionId);
      if (!session) {
        this.logger.warn('Session not found, creating new one', { sessionId });
        session = await this.sessions.create({ history: [], metadata: {} });
        sessionId = session.id;
      }
    } else {
      // Auto-create session if none provided
      session = await this.sessions.create({ history: [], metadata: {} });
      sessionId = session.id;
      this.logger.info('Auto-created session', { sessionId });
    }

    // Get current messages from request
    const currentMessages = params.messages || [];

    // Build full message history: session history + current messages
    const historyMessages = session.history.map((entry) => [
      { role: 'user', content: entry.prompt },
      { role: 'assistant', content: entry.response },
    ]).flat().filter(m => m.content); // Remove entries without content

    // Apply sliding window truncation
    const allMessages = [...historyMessages, ...currentMessages];
    const truncatedMessages = allMessages.slice(-MAX_HISTORY_MESSAGES);

    if (allMessages.length > truncatedMessages.length) {
      this.logger.debug('Truncated history', {
        original: allMessages.length,
        truncated: truncatedMessages.length,
      });
    }

    // Build ACP request with merged history
    const acpRequest: ACPRequest = {
      id: request.id,
      method: request.method,
      params: {
        ...params,
        messages: truncatedMessages,
        sessionId,
      },
    };

    // Create pipeline context
    const ctx: PipelineContext = {
      requestId: randomUUID(),
      sessionId,
      startTime: Date.now(),
      meta: {},
      logger: this.logger.child({ requestId: randomUUID(), sessionId }),
      onUpdate: async (notification) => {
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
      sessionId,
      historyLength: historyMessages.length,
    });

    // Execute through graph (entry point is the translator node)
    const result$ = await this.engine.execute('translator', message, ctx);

    // Wait for result with timeout
    const result = await firstValueFrom(result$.pipe(timeout(30000)));

    // Extract assistant response text
    const response = result.response as any;
    const responseContent = response?.content || [];
    const responseText = responseContent
      .map((c: any) => c.text || '')
      .join('\n');

    // Store in session history
    // Get the user's message (last user message in currentMessages)
    const userMessage = currentMessages.find((m: any) => m.role === 'user');
    if (userMessage && responseText) {
      const historyEntry = {
        requestId: ctx.requestId,
        timestamp: Date.now(),
        prompt: userMessage.content,
        response: responseText,
        stopReason: response?.stop_reason,
        usage: response?.usage ? {
          inputTokens: response.usage.input_tokens || 0,
          outputTokens: response.usage.output_tokens || 0,
          totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
        } : undefined,
      };

      await this.sessions.update(sessionId, {
        history: [...session.history, historyEntry],
      });

      this.logger.debug('Updated session history', {
        sessionId,
        historyLength: session.history.length + 1,
      });
    }

    // Send response with sessionId
    await this.transport.sendResponse({
      jsonrpc: '2.0',
      result: {
        ...(response || {}),
        sessionId,
      },
      id: request.id,
    });
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
