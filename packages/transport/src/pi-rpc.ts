/**
 * Pi RPC Transport
 * Handles Pi's JSON-RPC protocol over stdin/stdout
 * 
 * Converts between Pi RPC format and ACP/internal format
 */

import * as readline from 'node:readline';
import { Subject, Observable } from 'rxjs';
import type { ITransport, TransportConfig, Logger } from './transport.js';
import { TransportError } from './transport.js';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse, JsonRpcError } from './jsonrpc.js';
import { JsonRpcErrorCode } from './jsonrpc.js';

/**
 * Pi RPC transport configuration
 */
export interface PiRpcTransportConfig extends TransportConfig {
  /** Input stream (default: process.stdin) */
  input?: NodeJS.ReadableStream;

  /** Output stream (default: process.stdout) */
  output?: NodeJS.WritableStream;
}

/**
 * Pi RPC command structure
 */
interface PiRpcCommand {
  type: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Pi RPC response structure
 */
interface PiRpcResponse {
  type: 'response';
  id?: string;
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Pi RPC event structure
 */
interface PiRpcEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Pi RPC Transport
 * 
 * Implements ITransport interface but speaks Pi's JSON-RPC protocol.
 * Converts between Pi RPC format and ACP/internal JSON-RPC format.
 */
export class PiRpcTransport implements ITransport {
  private readonly input: NodeJS.ReadableStream;
  private readonly output: NodeJS.WritableStream;
  private readonly logger?: Logger;
  
  private rl?: readline.Interface;
  private requestSubject = new Subject<JsonRpcRequest>();
  private running = false;
  private requestCounter = 0;

  constructor(config: PiRpcTransportConfig = {}) {
    this.input = config.input ?? process.stdin;
    this.output = config.output ?? process.stdout;
    this.logger = config.logger;
  }

  /**
   * Start listening on stdin
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new TransportError('Transport already running');
    }

    this.logger?.info('Starting Pi RPC transport');

    // Create readline interface
    this.rl = readline.createInterface({
      input: this.input,
      terminal: false,
    });

    // Listen for lines
    this.rl.on('line', (line: string) => {
      this.handleLine(line);
    });

    // Handle close
    this.rl.on('close', () => {
      this.logger?.info('Stdin closed, shutting down');
      this.running = false;
      this.requestSubject.complete();
    });

    // Handle errors
    this.rl.on('error', (err: Error) => {
      this.logger?.error('Readline error', { error: err.message });
      this.requestSubject.error(new TransportError('Readline error', err));
    });

    this.running = true;
    this.logger?.info('Pi RPC transport started');
  }

  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.logger?.info('Stopping Pi RPC transport');
    
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }

    this.running = false;
    this.requestSubject.complete();
    this.logger?.info('Pi RPC transport stopped');
  }

  /**
   * Handle a single line from stdin
   */
  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    this.logger?.debug('Received Pi RPC line', { line: trimmed });

    try {
      const message = JSON.parse(trimmed) as PiRpcCommand | PiRpcResponse | PiRpcEvent;

      // Handle Pi RPC commands (convert to ACP requests)
      if ('type' in message && message.type !== 'response') {
        const piCommand = message as PiRpcCommand;
        const acpRequest = this.piCommandToAcpRequest(piCommand);
        
        this.logger?.debug('Converted Pi command to ACP request', { 
          piType: piCommand.type,
          acpMethod: acpRequest.method,
        });
        
        this.requestSubject.next(acpRequest);
      } else if (message.type === 'response') {
        // Pi RPC responses are not expected on stdin (we're the server)
        this.logger?.warn('Unexpected Pi RPC response on stdin', { message });
      }
    } catch (err) {
      this.logger?.error('Failed to parse Pi RPC message', { 
        line: trimmed, 
        error: err instanceof Error ? err.message : String(err) 
      });

      // Send error response in Pi RPC format
      try {
        const partial = JSON.parse(trimmed) as Record<string, unknown>;
        if ('id' in partial && partial.id) {
          void this.sendPiError(partial.id as string, 'Parse error', err);
        }
      } catch {
        // Can't send error response without id
      }
    }
  }

  /**
   * Convert Pi RPC command to ACP request
   */
  private piCommandToAcpRequest(piCommand: PiRpcCommand): JsonRpcRequest {
    const requestId = piCommand.id || `pi-${++this.requestCounter}`;

    // Map Pi command types to ACP methods
    switch (piCommand.type) {
      case 'prompt':
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: 'acp/prompt',
          params: {
            prompt: [
              { type: 'text', text: piCommand.message as string },
            ],
            attachments: piCommand.attachments || [],
            _meta: {
              pi: {
                originalCommand: piCommand.type,
              },
            },
          },
        };

      case 'get_state':
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: 'acp/get_state',
          params: {
            _meta: { pi: { originalCommand: 'get_state' } },
          },
        };

      case 'get_available_models':
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: 'acp/get_available_models',
          params: {
            _meta: { pi: { originalCommand: 'get_available_models' } },
          },
        };

      case 'set_model':
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: 'acp/set_model',
          params: {
            provider: piCommand.provider,
            modelId: piCommand.modelId,
            _meta: { pi: { originalCommand: 'set_model' } },
          },
        };

      case 'abort':
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: 'acp/abort',
          params: {
            _meta: { pi: { originalCommand: 'abort' } },
          },
        };

      default:
        // Generic passthrough for unknown commands
        return {
          jsonrpc: '2.0',
          id: requestId,
          method: `acp/${piCommand.type}`,
          params: {
            ...piCommand,
            _meta: { pi: { originalCommand: piCommand.type } },
          },
        };
    }
  }

  /**
   * Convert ACP response to Pi RPC response
   */
  private acpResponseToPiResponse(
    acpResponse: JsonRpcResponse,
    originalCommand?: string
  ): PiRpcResponse {
    return {
      type: 'response',
      id: acpResponse.id as string | undefined,
      command: originalCommand || 'unknown',
      success: !('error' in acpResponse),
      data: 'result' in acpResponse ? acpResponse.result : undefined,
      error: 'error' in acpResponse ? acpResponse.error.message : undefined,
    };
  }

  /**
   * Convert ACP notification to Pi RPC event
   */
  private acpNotificationToPiEvent(notification: JsonRpcNotification): PiRpcEvent {
    const params = notification.params as Record<string, unknown>;

    // Handle session updates
    if (notification.method === 'acp/session/update') {
      const update = params.update as Record<string, unknown>;
      
      if (update.type === 'content_chunk') {
        const content = update.content as { type: string; text?: string };
        return {
          type: 'text_chunk',
          text: content.text || '',
        };
      } else if (update.type === 'thinking_chunk') {
        const content = update.content as { type: string; text?: string };
        return {
          type: 'thinking_chunk',
          text: content.text || '',
        };
      } else if (update.type === 'generation_complete') {
        return {
          type: 'generation_complete',
          stopReason: update.stopReason || 'end_turn',
          usage: update.usage,
        };
      }
    }

    // Generic event passthrough
    return {
      type: 'event',
      method: notification.method,
      params: notification.params,
    };
  }

  /**
   * Observable of incoming requests
   */
  get requests$(): Observable<JsonRpcRequest> {
    return this.requestSubject.asObservable();
  }

  /**
   * Send a response
   */
  async sendResponse(response: JsonRpcResponse): Promise<void> {
    this.logger?.debug('Sending ACP response as Pi RPC', { id: response.id });
    
    // Extract original command from metadata if available
    const result = response.result as Record<string, unknown> | undefined;
    const meta = result?._meta as Record<string, unknown> | undefined;
    const piMeta = meta?.pi as Record<string, unknown> | undefined;
    const originalCommand = piMeta?.originalCommand as string | undefined;

    const piResponse = this.acpResponseToPiResponse(response, originalCommand);
    await this.writeLine(piResponse);
  }

  /**
   * Send an error response
   */
  async sendError(error: JsonRpcError): Promise<void> {
    this.logger?.debug('Sending ACP error as Pi RPC', { 
      id: error.id,
      code: error.error.code,
    });

    const piResponse: PiRpcResponse = {
      type: 'response',
      id: error.id as string | undefined,
      command: 'unknown',
      success: false,
      error: error.error.message,
    };

    await this.writeLine(piResponse);
  }

  /**
   * Send a notification
   */
  async sendNotification(notification: JsonRpcNotification): Promise<void> {
    this.logger?.debug('Sending ACP notification as Pi RPC event', { 
      method: notification.method,
    });

    const piEvent = this.acpNotificationToPiEvent(notification);
    await this.writeLine(piEvent);
  }

  /**
   * Send Pi RPC error response
   */
  private async sendPiError(id: string, message: string, error?: unknown): Promise<void> {
    const piResponse: PiRpcResponse = {
      type: 'response',
      id,
      command: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : message,
    };

    await this.writeLine(piResponse);
  }

  /**
   * Write a message to stdout
   */
  private async writeLine(message: unknown): Promise<void> {
    if (!this.running) {
      throw new TransportError('Transport not running');
    }

    try {
      const json = JSON.stringify(message);
      this.output.write(json + '\n');
    } catch (err) {
      throw new TransportError('Failed to serialize message', err);
    }
  }

  /**
   * Check if transport is running
   */
  get isRunning(): boolean {
    return this.running;
  }
}
