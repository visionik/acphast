/**
 * In-Memory Session Repository
 * Simple implementation that stores sessions in memory
 */

import type { Session } from '@acphast/core';
import { ISessionRepository, SessionNotFoundError } from './repository.js';
import { randomUUID } from 'crypto';

/**
 * Configuration for memory session repository
 */
export interface MemorySessionConfig {
  /** Maximum number of sessions to keep */
  maxSessions?: number;

  /** Session TTL in milliseconds (0 = no expiration) */
  ttl?: number;

  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
}

/**
 * In-memory session repository implementation
 * Sessions are lost when the process restarts
 */
export class MemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, Session>();
  private cleanupTimer?: NodeJS.Timeout;
  private config: Required<MemorySessionConfig>;

  constructor(config: MemorySessionConfig = {}) {
    this.config = {
      maxSessions: config.maxSessions ?? 1000,
      ttl: config.ttl ?? 0, // 0 = no expiration
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
    };

    if (this.config.ttl > 0) {
      this.startCleanup();
    }
  }

  async create(
    session: Omit<Session, 'id' | 'createdAt' | 'lastAccessedAt'>
  ): Promise<Session> {
    const id = randomUUID();
    const now = Date.now();

    const newSession: Session = {
      ...session,
      id,
      createdAt: now,
      lastAccessedAt: now,
    };

    // Check max sessions limit
    if (this.sessions.size >= this.config.maxSessions) {
      // Remove oldest session
      const oldestId = this.findOldestSession();
      if (oldestId) {
        this.sessions.delete(oldestId);
      }
    }

    this.sessions.set(id, newSession);
    return newSession;
  }

  async get(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    // Check if expired
    if (this.isExpired(session)) {
      this.sessions.delete(id);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    return session;
  }

  async update(id: string, updates: Partial<Session>): Promise<Session> {
    const session = await this.get(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }

    const updated: Session = {
      ...session,
      ...updates,
      id, // Prevent ID changes
      lastAccessedAt: Date.now(),
    };

    this.sessions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async list(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((s) => !this.isExpired(s));
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  async find(filter: Partial<Session>): Promise<Session[]> {
    const sessions = await this.list();

    return sessions.filter((session) => {
      for (const [key, value] of Object.entries(filter)) {
        if (session[key as keyof Session] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get repository statistics
   */
  getStats(): {
    count: number;
    maxSessions: number;
    ttl: number;
  } {
    return {
      count: this.sessions.size,
      maxSessions: this.config.maxSessions,
      ttl: this.config.ttl,
    };
  }

  /**
   * Destroy the repository and cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.sessions.clear();
  }

  // Private methods

  private isExpired(session: Session): boolean {
    if (this.config.ttl === 0) {
      return false;
    }

    const age = Date.now() - session.lastAccessedAt;
    return age > this.config.ttl;
  }

  private findOldestSession(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastAccessedAt < oldestTime) {
        oldestTime = session.lastAccessedAt;
        oldestId = id;
      }
    }

    return oldestId;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't keep the process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt > this.config.ttl) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.sessions.delete(id);
    }
  }
}
