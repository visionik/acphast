/**
 * In-Memory Session Repository
 * Simple implementation that stores sessions in memory
 */
import { SessionNotFoundError } from './repository.js';
import { randomUUID } from 'crypto';
/**
 * In-memory session repository implementation
 * Sessions are lost when the process restarts
 */
export class MemorySessionRepository {
    sessions = new Map();
    cleanupTimer;
    config;
    constructor(config = {}) {
        this.config = {
            maxSessions: config.maxSessions ?? 1000,
            ttl: config.ttl ?? 0, // 0 = no expiration
            cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
        };
        if (this.config.ttl > 0) {
            this.startCleanup();
        }
    }
    async create(session) {
        const id = randomUUID();
        const now = Date.now();
        const newSession = {
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
    async get(id) {
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
    async update(id, updates) {
        const session = await this.get(id);
        if (!session) {
            throw new SessionNotFoundError(id);
        }
        const updated = {
            ...session,
            ...updates,
            id, // Prevent ID changes
            lastAccessedAt: Date.now(),
        };
        this.sessions.set(id, updated);
        return updated;
    }
    async delete(id) {
        this.sessions.delete(id);
    }
    async list() {
        return Array.from(this.sessions.values()).filter((s) => !this.isExpired(s));
    }
    async clear() {
        this.sessions.clear();
    }
    async find(filter) {
        const sessions = await this.list();
        return sessions.filter((session) => {
            for (const [key, value] of Object.entries(filter)) {
                if (session[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Get repository statistics
     */
    getStats() {
        return {
            count: this.sessions.size,
            maxSessions: this.config.maxSessions,
            ttl: this.config.ttl,
        };
    }
    /**
     * Destroy the repository and cleanup
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.sessions.clear();
    }
    // Private methods
    isExpired(session) {
        if (this.config.ttl === 0) {
            return false;
        }
        const age = Date.now() - session.lastAccessedAt;
        return age > this.config.ttl;
    }
    findOldestSession() {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, session] of this.sessions.entries()) {
            if (session.lastAccessedAt < oldestTime) {
                oldestTime = session.lastAccessedAt;
                oldestId = id;
            }
        }
        return oldestId;
    }
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        // Don't keep the process alive just for cleanup
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
    cleanup() {
        const now = Date.now();
        const expired = [];
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
//# sourceMappingURL=memory.js.map