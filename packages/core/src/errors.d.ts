/**
 * Error utilities for Acphast
 */
import { ACPErrorCode, type ACPError } from './acp.js';
/**
 * Create a standard ACP error
 */
export declare function createACPError(code: ACPErrorCode, message: string, data?: unknown): ACPError;
/**
 * Check if an error is transient (should retry)
 */
export declare function isTransientError(error: ACPError | Error): boolean;
/**
 * Check if an error is permanent (should not retry)
 */
export declare function isPermanentError(error: ACPError | Error): boolean;
/**
 * Acphast base error class
 */
export declare class AcphastError extends Error {
    code: ACPErrorCode;
    data?: unknown | undefined;
    constructor(message: string, code: ACPErrorCode, data?: unknown | undefined);
    toACPError(): ACPError;
}
/**
 * Backend unavailable error
 */
export declare class BackendUnavailableError extends AcphastError {
    constructor(backend: string, cause?: Error);
}
/**
 * Backend returned an error
 */
export declare class BackendError extends AcphastError {
    constructor(backend: string, originalError: unknown);
}
/**
 * Capability not supported
 */
export declare class CapabilityUnsupportedError extends AcphastError {
    constructor(capability: string, backend: string);
}
/**
 * Rate limit exceeded
 */
export declare class RateLimitError extends AcphastError {
    constructor(backend: string, retryAfterMs?: number);
}
/**
 * Context window exceeded
 */
export declare class ContextExceededError extends AcphastError {
    constructor(backend: string, tokenCount: number, maxTokens: number);
}
/**
 * Authentication failed
 */
export declare class AuthenticationError extends AcphastError {
    constructor(backend: string);
}
/**
 * Parse error (invalid JSON-RPC)
 */
export declare class ParseError extends AcphastError {
    constructor(cause?: Error);
}
/**
 * Invalid request format
 */
export declare class InvalidRequestError extends AcphastError {
    constructor(reason: string);
}
/**
 * Method not found
 */
export declare class MethodNotFoundError extends AcphastError {
    constructor(method: string);
}
/**
 * Invalid parameters
 */
export declare class InvalidParamsError extends AcphastError {
    constructor(reason: string);
}
/**
 * Internal error
 */
export declare class InternalError extends AcphastError {
    constructor(message: string, cause?: Error);
}
//# sourceMappingURL=errors.d.ts.map