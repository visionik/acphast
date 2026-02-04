/**
 * Session Repository Interface
 * Abstract interface for session storage implementations
 */

import type { Session } from '@acphast/core';

/**
 * Session repository interface
 * Implementations can store sessions in memory, database, etc.
 */
export interface ISessionRepository {
  /**
   * Create a new session
   */
  create(session: Omit<Session, 'id' | 'createdAt' | 'lastAccessedAt'>): Promise<Session>;

  /**
   * Get a session by ID
   * @returns Session if found, null otherwise
   */
  get(id: string): Promise<Session | null>;

  /**
   * Update an existing session
   */
  update(id: string, updates: Partial<Session>): Promise<Session>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<void>;

  /**
   * List all sessions (optional, for management)
   */
  list?(): Promise<Session[]>;

  /**
   * Clear all sessions (optional, for testing)
   */
  clear?(): Promise<void>;

  /**
   * Get sessions by filter criteria (optional)
   */
  find?(filter: Partial<Session>): Promise<Session[]>;
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Session already exists error
 */
export class SessionExistsError extends Error {
  constructor(sessionId: string) {
    super(`Session already exists: ${sessionId}`);
    this.name = 'SessionExistsError';
  }
}
