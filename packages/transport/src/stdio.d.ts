/**
 * Stdio Transport
 * JSON-RPC 2.0 over stdin/stdout
 */
import { Observable } from 'rxjs';
import type { ITransport, TransportConfig } from './transport.js';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse, JsonRpcError } from './jsonrpc.js';
/**
 * Stdio transport configuration
 */
export interface StdioTransportConfig extends TransportConfig {
    /** Input stream (default: process.stdin) */
    input?: NodeJS.ReadableStream;
    /** Output stream (default: process.stdout) */
    output?: NodeJS.WritableStream;
    /** Error stream (default: process.stderr) */
    errorStream?: NodeJS.WritableStream;
}
/**
 * Stdio Transport Implementation
 *
 * Reads JSON-RPC messages from stdin (one per line)
 * Writes JSON-RPC messages to stdout (one per line)
 * Logs to stderr
 */
export declare class StdioTransport implements ITransport {
    private readonly input;
    private readonly output;
    private readonly logger?;
    private rl?;
    private requestSubject;
    private running;
    constructor(config?: StdioTransportConfig);
    /**
     * Start listening on stdin
     */
    start(): Promise<void>;
    /**
     * Stop the transport
     */
    stop(): Promise<void>;
    /**
     * Handle a single line from stdin
     */
    private handleLine;
    /**
     * Observable of incoming requests
     */
    get requests$(): Observable<JsonRpcRequest>;
    /**
     * Send a response to stdout
     */
    sendResponse(response: JsonRpcResponse): Promise<void>;
    /**
     * Send an error response to stdout
     */
    sendError(error: JsonRpcError): Promise<void>;
    /**
     * Send a notification to stdout
     */
    sendNotification(notification: JsonRpcNotification): Promise<void>;
    /**
     * Write a JSON-RPC message to stdout
     */
    private writeLine;
    /**
     * Check if transport is running
     */
    get isRunning(): boolean;
}
//# sourceMappingURL=stdio.d.ts.map