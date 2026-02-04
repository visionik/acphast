/**
 * Stdio Transport
 * JSON-RPC 2.0 over stdin/stdout
 */
import * as readline from 'node:readline';
import { Subject } from 'rxjs';
import { TransportError, TransportParseError } from './transport.js';
import { isJsonRpcRequest, JsonRpcErrorCode } from './jsonrpc.js';
/**
 * Stdio Transport Implementation
 *
 * Reads JSON-RPC messages from stdin (one per line)
 * Writes JSON-RPC messages to stdout (one per line)
 * Logs to stderr
 */
export class StdioTransport {
    input;
    output;
    logger;
    rl;
    requestSubject = new Subject();
    running = false;
    constructor(config = {}) {
        this.input = config.input ?? process.stdin;
        this.output = config.output ?? process.stdout;
        this.logger = config.logger;
    }
    /**
     * Start listening on stdin
     */
    async start() {
        if (this.running) {
            throw new TransportError('Transport already running');
        }
        this.logger?.info('Starting stdio transport');
        // Create readline interface
        this.rl = readline.createInterface({
            input: this.input,
            output: this.output,
            terminal: false, // Important: treat as data stream, not TTY
        });
        // Listen for lines
        this.rl.on('line', (line) => {
            this.handleLine(line);
        });
        // Handle close
        this.rl.on('close', () => {
            this.logger?.info('Stdin closed, shutting down');
            this.running = false;
            this.requestSubject.complete();
        });
        // Handle errors
        this.rl.on('error', (err) => {
            this.logger?.error('Readline error', { error: err.message });
            this.requestSubject.error(new TransportError('Readline error', err));
        });
        this.running = true;
        this.logger?.info('Stdio transport started');
    }
    /**
     * Stop the transport
     */
    async stop() {
        if (!this.running) {
            return;
        }
        this.logger?.info('Stopping stdio transport');
        if (this.rl) {
            this.rl.close();
            this.rl = undefined;
        }
        this.running = false;
        this.requestSubject.complete();
        this.logger?.info('Stdio transport stopped');
    }
    /**
     * Handle a single line from stdin
     */
    handleLine(line) {
        const trimmed = line.trim();
        if (!trimmed) {
            return; // Skip empty lines
        }
        this.logger?.debug('Received line', { line: trimmed });
        try {
            const message = JSON.parse(trimmed);
            // Only emit requests to the observable
            if (isJsonRpcRequest(message)) {
                this.logger?.debug('Parsed request', { method: message.method, id: message.id });
                this.requestSubject.next(message);
            }
            else {
                // Responses and notifications are not expected on stdin (we're the server)
                this.logger?.warn('Unexpected message type on stdin', { message });
            }
        }
        catch (err) {
            this.logger?.error('Failed to parse JSON-RPC message', {
                line: trimmed,
                error: err instanceof Error ? err.message : String(err)
            });
            // Try to extract id if possible to send error response
            try {
                const partial = JSON.parse(trimmed);
                if ('id' in partial) {
                    void this.sendError({
                        jsonrpc: '2.0',
                        error: {
                            code: JsonRpcErrorCode.ParseError,
                            message: 'Parse error',
                            data: err instanceof Error ? err.message : String(err),
                        },
                        id: partial.id,
                    });
                }
            }
            catch {
                // Can't send error response without id
            }
        }
    }
    /**
     * Observable of incoming requests
     */
    get requests$() {
        return this.requestSubject.asObservable();
    }
    /**
     * Send a response to stdout
     */
    async sendResponse(response) {
        this.logger?.debug('Sending response', { id: response.id });
        await this.writeLine(response);
    }
    /**
     * Send an error response to stdout
     */
    async sendError(error) {
        this.logger?.debug('Sending error', {
            id: error.id,
            code: error.error.code,
            message: error.error.message,
        });
        await this.writeLine(error);
    }
    /**
     * Send a notification to stdout
     */
    async sendNotification(notification) {
        this.logger?.debug('Sending notification', { method: notification.method });
        await this.writeLine(notification);
    }
    /**
     * Write a JSON-RPC message to stdout
     */
    async writeLine(message) {
        if (!this.running) {
            throw new TransportError('Transport not running');
        }
        try {
            const json = JSON.stringify(message);
            this.output.write(json + '\n');
        }
        catch (err) {
            throw new TransportParseError('Failed to serialize message', err);
        }
    }
    /**
     * Check if transport is running
     */
    get isRunning() {
        return this.running;
    }
}
//# sourceMappingURL=stdio.js.map