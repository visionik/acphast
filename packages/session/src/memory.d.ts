/**
 * In-Memory Session Repository
 * Simple implementation that stores sessions in memory
 */
import type { Session } from '@acphast/core';
import { ISessionRepository } from './repository.js';
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
export declare class MemorySessionRepository implements ISessionRepository {
    private sessions;
    private cleanupTimer?;
    private config;
    constructor(config?: MemorySessionConfig);
    create(session: Omit<Session, 'id' | 'createdAt' | 'lastAccessedAt'>): Promise<Session>;
    get(id: string): Promise<Session | null>;
    update(id: string, updates: Partial<Session>): Promise<Session>;
    delete(id: string): Promise<void>;
    list(): Promise<Session[]>;
    clear(): Promise<void>;
    find(filter: Partial<Session>): Promise<Session[]>;
    /**
     * Get repository statistics
     */
    getStats(): {
        count: number;
        maxSessions: number;
        ttl: number;
    };
    /**
     * Destroy the repository and cleanup
     */
    destroy(): void;
    private isExpired;
    private findOldestSession;
    private startCleanup;
    private cleanup;
}
//# sourceMappingURL=memory.d.ts.map