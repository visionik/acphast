/**
 * Base Transport Interface
 */
/**
 * Transport error types
 */
export class TransportError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'TransportError';
    }
}
export class TransportConnectionError extends TransportError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'TransportConnectionError';
    }
}
export class TransportParseError extends TransportError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'TransportParseError';
    }
}
//# sourceMappingURL=transport.js.map