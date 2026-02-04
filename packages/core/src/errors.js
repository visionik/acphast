/**
 * Error utilities for Acphast
 */
import { ACPErrorCode } from './acp.js';
/**
 * Create a standard ACP error
 */
export function createACPError(code, message, data) {
    return { code, message, data };
}
/**
 * Check if an error is transient (should retry)
 */
export function isTransientError(error) {
    if ('code' in error) {
        return (error.code === ACPErrorCode.RateLimited ||
            error.code === ACPErrorCode.BackendUnavailable ||
            error.code === -503 // Service unavailable
        );
    }
    return false;
}
/**
 * Check if an error is permanent (should not retry)
 */
export function isPermanentError(error) {
    if ('code' in error) {
        return (error.code === ACPErrorCode.AuthFailed ||
            error.code === ACPErrorCode.InvalidParams ||
            error.code === ACPErrorCode.InvalidRequest ||
            error.code === ACPErrorCode.CapabilityUnsupported);
    }
    return false;
}
/**
 * Acphast base error class
 */
export class AcphastError extends Error {
    code;
    data;
    constructor(message, code, data) {
        super(message);
        this.code = code;
        this.data = data;
        this.name = 'AcphastError';
    }
    toACPError() {
        return {
            code: this.code,
            message: this.message,
            data: this.data,
        };
    }
}
/**
 * Backend unavailable error
 */
export class BackendUnavailableError extends AcphastError {
    constructor(backend, cause) {
        super(`Backend "${backend}" is unavailable`, ACPErrorCode.BackendUnavailable, { backend, cause: cause?.message });
        this.name = 'BackendUnavailableError';
    }
}
/**
 * Backend returned an error
 */
export class BackendError extends AcphastError {
    constructor(backend, originalError) {
        super(`Backend "${backend}" returned an error`, ACPErrorCode.BackendError, { backend, originalError });
        this.name = 'BackendError';
    }
}
/**
 * Capability not supported
 */
export class CapabilityUnsupportedError extends AcphastError {
    constructor(capability, backend) {
        super(`Capability "${capability}" not supported by backend "${backend}"`, ACPErrorCode.CapabilityUnsupported, { capability, backend });
        this.name = 'CapabilityUnsupportedError';
    }
}
/**
 * Rate limit exceeded
 */
export class RateLimitError extends AcphastError {
    constructor(backend, retryAfterMs) {
        super(`Rate limit exceeded for backend "${backend}"`, ACPErrorCode.RateLimited, { backend, retryAfterMs });
        this.name = 'RateLimitError';
    }
}
/**
 * Context window exceeded
 */
export class ContextExceededError extends AcphastError {
    constructor(backend, tokenCount, maxTokens) {
        super(`Context window exceeded for backend "${backend}"`, ACPErrorCode.ContextExceeded, { backend, tokenCount, maxTokens });
        this.name = 'ContextExceededError';
    }
}
/**
 * Authentication failed
 */
export class AuthenticationError extends AcphastError {
    constructor(backend) {
        super(`Authentication failed for backend "${backend}"`, ACPErrorCode.AuthFailed, { backend });
        this.name = 'AuthenticationError';
    }
}
/**
 * Parse error (invalid JSON-RPC)
 */
export class ParseError extends AcphastError {
    constructor(cause) {
        super('Failed to parse request', ACPErrorCode.ParseError, { cause: cause?.message });
        this.name = 'ParseError';
    }
}
/**
 * Invalid request format
 */
export class InvalidRequestError extends AcphastError {
    constructor(reason) {
        super(`Invalid request: ${reason}`, ACPErrorCode.InvalidRequest, { reason });
        this.name = 'InvalidRequestError';
    }
}
/**
 * Method not found
 */
export class MethodNotFoundError extends AcphastError {
    constructor(method) {
        super(`Method not found: ${method}`, ACPErrorCode.MethodNotFound, { method });
        this.name = 'MethodNotFoundError';
    }
}
/**
 * Invalid parameters
 */
export class InvalidParamsError extends AcphastError {
    constructor(reason) {
        super(`Invalid parameters: ${reason}`, ACPErrorCode.InvalidParams, { reason });
        this.name = 'InvalidParamsError';
    }
}
/**
 * Internal error
 */
export class InternalError extends AcphastError {
    constructor(message, cause) {
        super(message, ACPErrorCode.InternalError, { cause: cause?.message });
        this.name = 'InternalError';
    }
}
//# sourceMappingURL=errors.js.map