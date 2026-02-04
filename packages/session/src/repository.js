/**
 * Session Repository Interface
 * Abstract interface for session storage implementations
 */
/**
 * Session not found error
 */
export class SessionNotFoundError extends Error {
    constructor(sessionId) {
        super(`Session not found: ${sessionId}`);
        this.name = 'SessionNotFoundError';
    }
}
/**
 * Session already exists error
 */
export class SessionExistsError extends Error {
    constructor(sessionId) {
        super(`Session already exists: ${sessionId}`);
        this.name = 'SessionExistsError';
    }
}
//# sourceMappingURL=repository.js.map