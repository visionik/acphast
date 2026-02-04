/**
 * Base Transport Interface
 */

import type { Observable } from 'rxjs';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse, JsonRpcError } from './jsonrpc.js';

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Logger instance */
  logger?: Logger;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Base transport interface
 */
export interface ITransport {
  /**
   * Start the transport
   */
  start(): Promise<void>;

  /**
   * Stop the transport
   */
  stop(): Promise<void>;

  /**
   * Observable stream of incoming requests
   */
  readonly requests$: Observable<JsonRpcRequest>;

  /**
   * Send a response
   */
  sendResponse(response: JsonRpcResponse): Promise<void>;

  /**
   * Send an error response
   */
  sendError(error: JsonRpcError): Promise<void>;

  /**
   * Send a notification (no response expected)
   */
  sendNotification(notification: JsonRpcNotification): Promise<void>;

  /**
   * Is transport running?
   */
  readonly isRunning: boolean;
}

/**
 * Transport error types
 */
export class TransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TransportError';
  }
}

export class TransportConnectionError extends TransportError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TransportConnectionError';
  }
}

export class TransportParseError extends TransportError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TransportParseError';
  }
}
