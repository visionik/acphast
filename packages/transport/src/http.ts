/**
 * HTTP Transport with Server-Sent Events
 * JSON-RPC 2.0 over HTTP POST + SSE for streaming
 */

import * as http from 'node:http';
import { Subject, Observable } from 'rxjs';
import type { ITransport, TransportConfig, Logger } from './transport.js';
import { TransportError } from './transport.js';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse, JsonRpcError } from './jsonrpc.js';
import { isJsonRpcRequest, JsonRpcErrorCode } from './jsonrpc.js';

/**
 * HTTP transport configuration
 */
export interface HttpTransportConfig extends TransportConfig {
  /** Port to listen on (default: 6809) */
  port?: number;

  /** Host to bind to (default: localhost) */
  host?: string;

  /** Enable CORS (default: true) */
  cors?: boolean;
}

/**
 * Active SSE connection
 */
interface SseConnection {
  response: http.ServerResponse;
  requestId: string;
}

/**
 * HTTP Transport with SSE
 * 
 * - POST /rpc - Send JSON-RPC requests
 * - GET /events/:requestId - Receive streaming updates via SSE
 */
export class HttpTransport implements ITransport {
  private server?: http.Server;
  private requestSubject = new Subject<JsonRpcRequest>();
  private sseConnections = new Map<string, SseConnection>();
  private pendingResponses = new Map<string | number, http.ServerResponse>();
  private running = false;
  private readonly port: number;
  private readonly host: string;
  private readonly cors: boolean;
  private readonly logger?: Logger;

  constructor(config: HttpTransportConfig = {}) {
    this.port = config.port ?? 6809;
    this.host = config.host ?? 'localhost';
    this.cors = config.cors ?? true;
    this.logger = config.logger;
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new TransportError('Transport already running');
    }

    this.logger?.info('Starting HTTP transport', { port: this.port, host: this.host });

    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, this.host, () => {
        this.running = true;
        this.logger?.info('HTTP transport started', { 
          port: this.port, 
          host: this.host,
          url: `http://${this.host}:${this.port}`,
        });
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * Stop HTTP server
   */
  async stop(): Promise<void> {
    if (!this.running || !this.server) {
      return;
    }

    this.logger?.info('Stopping HTTP transport');

    // Close all SSE connections
    for (const conn of this.sseConnections.values()) {
      conn.response.end();
    }
    this.sseConnections.clear();

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.requestSubject.complete();
        this.logger?.info('HTTP transport stopped');
        resolve();
      });
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // CORS headers
    if (this.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Route: POST /rpc - JSON-RPC endpoint
    if (req.method === 'POST' && url.pathname === '/rpc') {
      await this.handleRpcRequest(req, res);
      return;
    }

    // Route: GET /events/:requestId - SSE endpoint
    if (req.method === 'GET' && url.pathname.startsWith('/events/')) {
      const requestId = url.pathname.slice(8);
      this.handleSseConnection(requestId, res);
      return;
    }

    // Route: GET / - Simple status page
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Acphast HTTP Transport\n\nPOST /rpc - JSON-RPC endpoint\nGET /events/:id - SSE streaming\n');
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }

  /**
   * Handle JSON-RPC POST request
   */
  private async handleRpcRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      // Read request body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString('utf-8');

      this.logger?.debug('Received RPC request', { body });

      // Parse JSON
      const message = JSON.parse(body);

      if (!isJsonRpcRequest(message)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.InvalidRequest,
            message: 'Invalid JSON-RPC request',
          },
          id: null,
        }));
        return;
      }

      // Store response object for this request ID
      if (message.id !== null && message.id !== undefined) {
        this.pendingResponses.set(message.id, res);
      }

      // Emit to request stream
      this.requestSubject.next(message);

    } catch (err) {
      this.logger?.error('RPC request error', {
        error: err instanceof Error ? err.message : String(err),
      });

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCode.ParseError,
          message: 'Parse error',
          data: err instanceof Error ? err.message : String(err),
        },
        id: null,
      }));
    }
  }

  /**
   * Handle SSE connection
   */
  private handleSseConnection(requestId: string, res: http.ServerResponse): void {
    this.logger?.debug('SSE connection established', { requestId });

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Store connection
    this.sseConnections.set(requestId, { response: res, requestId });

    // Send initial connection event
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({ requestId })}\n\n`);

    // Handle client disconnect
    res.on('close', () => {
      this.logger?.debug('SSE connection closed', { requestId });
      this.sseConnections.delete(requestId);
    });
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
    this.logger?.debug('Sending response', { id: response.id });
    
    if (response.id === null) {
      this.logger?.warn('Cannot send response with null ID');
      return;
    }
    
    const res = this.pendingResponses.get(response.id);
    if (!res) {
      this.logger?.warn('No pending response for ID', { id: response.id });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
    this.pendingResponses.delete(response.id);
  }

  /**
   * Send an error response
   */
  async sendError(error: JsonRpcError): Promise<void> {
    this.logger?.debug('Sending error', {
      id: error.id,
      code: error.error.code,
      message: error.error.message,
    });
    
    if (error.id === null) {
      this.logger?.warn('Cannot send error with null ID');
      return;
    }
    
    const res = this.pendingResponses.get(error.id);
    if (!res) {
      this.logger?.warn('No pending response for ID', { id: error.id });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(error));
    this.pendingResponses.delete(error.id);
  }

  /**
   * Send a notification via SSE
   */
  async sendNotification(notification: JsonRpcNotification): Promise<void> {
    this.logger?.debug('Sending notification', { method: notification.method });

    // Extract requestId from notification params
    const requestId = (notification.params as any)?.requestId;
    if (!requestId) {
      this.logger?.warn('Notification missing requestId, cannot route to SSE');
      return;
    }

    const conn = this.sseConnections.get(requestId);
    if (!conn) {
      this.logger?.debug('No SSE connection for requestId', { requestId });
      return;
    }

    // Send as SSE event
    const json = JSON.stringify(notification);
    conn.response.write(`event: notification\n`);
    conn.response.write(`data: ${json}\n\n`);
  }

  /**
   * Check if transport is running
   */
  get isRunning(): boolean {
    return this.running;
  }
}
