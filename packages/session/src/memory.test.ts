import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemorySessionRepository } from './memory.js';
import { SessionNotFoundError } from './repository.js';

describe('MemorySessionRepository', () => {
  let repo: MemorySessionRepository;

  beforeEach(() => {
    repo = new MemorySessionRepository();
  });

  afterEach(() => {
    repo.destroy();
  });

  describe('create', () => {
    it('should create a session with generated id and timestamps', async () => {
      const session = await repo.create({
        history: [],
        metadata: { test: true },
      });

      expect(session.id).toBeDefined();
      expect(session.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(session.history).toEqual([]);
      expect(session.metadata).toEqual({ test: true });
      expect(session.createdAt).toBeDefined();
      expect(session.lastAccessedAt).toBeDefined();
      expect(session.createdAt).toBe(session.lastAccessedAt);
    });

    it('should remove oldest session when maxSessions is reached', async () => {
      const limitedRepo = new MemorySessionRepository({ maxSessions: 2 });

      const session1 = await limitedRepo.create({ history: [], metadata: { n: 1 } });
      await limitedRepo.create({ history: [], metadata: { n: 2 } });
      await limitedRepo.create({ history: [], metadata: { n: 3 } });

      // Session 1 should be removed
      const retrieved = await limitedRepo.get(session1.id);
      expect(retrieved).toBeNull();

      // Stats should show 2 sessions
      expect(limitedRepo.getStats().count).toBe(2);

      limitedRepo.destroy();
    });
  });

  describe('get', () => {
    it('should return session by id', async () => {
      const created = await repo.create({ history: [], metadata: {} });
      const retrieved = await repo.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await repo.get('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should update lastAccessedAt on get', async () => {
      const created = await repo.create({ history: [], metadata: {} });
      const originalAccessTime = created.lastAccessedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const retrieved = await repo.get(created.id);
      expect(retrieved?.lastAccessedAt).toBeGreaterThan(originalAccessTime);
    });

    it('should return null and delete expired session', async () => {
      const ttlRepo = new MemorySessionRepository({ ttl: 50 });
      const session = await ttlRepo.create({ history: [], metadata: {} });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const retrieved = await ttlRepo.get(session.id);
      expect(retrieved).toBeNull();

      ttlRepo.destroy();
    });
  });

  describe('update', () => {
    it('should update session fields', async () => {
      const created = await repo.create({ history: [], metadata: { original: true } });

      const updated = await repo.update(created.id, {
        metadata: { updated: true },
      });

      expect(updated.metadata).toEqual({ updated: true });
      expect(updated.id).toBe(created.id); // ID should not change
    });

    it('should prevent ID changes', async () => {
      const created = await repo.create({ history: [], metadata: {} });

      const updated = await repo.update(created.id, {
        id: 'hacked-id',
      } as any);

      expect(updated.id).toBe(created.id);
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      await expect(repo.update('non-existent', { metadata: {} })).rejects.toThrow(
        SessionNotFoundError
      );
    });

    it('should update lastAccessedAt on update', async () => {
      const created = await repo.create({ history: [], metadata: {} });
      const originalAccessTime = created.lastAccessedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo.update(created.id, { metadata: { x: 1 } });
      expect(updated.lastAccessedAt).toBeGreaterThan(originalAccessTime);
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      const session = await repo.create({ history: [], metadata: {} });

      await repo.delete(session.id);

      const retrieved = await repo.get(session.id);
      expect(retrieved).toBeNull();
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(repo.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('list', () => {
    it('should return all non-expired sessions', async () => {
      await repo.create({ history: [], metadata: { n: 1 } });
      await repo.create({ history: [], metadata: { n: 2 } });
      await repo.create({ history: [], metadata: { n: 3 } });

      const sessions = await repo.list();
      expect(sessions).toHaveLength(3);
    });

    it('should exclude expired sessions', async () => {
      const ttlRepo = new MemorySessionRepository({ ttl: 50 });
      await ttlRepo.create({ history: [], metadata: { n: 1 } });

      await new Promise((resolve) => setTimeout(resolve, 60));

      await ttlRepo.create({ history: [], metadata: { n: 2 } });

      const sessions = await ttlRepo.list();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].metadata).toEqual({ n: 2 });

      ttlRepo.destroy();
    });
  });

  describe('clear', () => {
    it('should remove all sessions', async () => {
      await repo.create({ history: [], metadata: {} });
      await repo.create({ history: [], metadata: {} });

      await repo.clear();

      const sessions = await repo.list();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('find', () => {
    it('should find sessions matching filter', async () => {
      await repo.create({ history: [], metadata: { type: 'a' } });
      await repo.create({ history: [], metadata: { type: 'b' } });
      await repo.create({ history: [], metadata: { type: 'a' } });

      // Note: find filters on Session properties, not nested metadata
      // This test uses the cwd field instead
      const session1 = await repo.create({ history: [], metadata: {}, cwd: '/path/a' });
      await repo.create({ history: [], metadata: {}, cwd: '/path/b' });

      const found = await repo.find({ cwd: '/path/a' });
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(session1.id);
    });
  });

  describe('getStats', () => {
    it('should return repository statistics', async () => {
      const customRepo = new MemorySessionRepository({
        maxSessions: 500,
        ttl: 3600000,
      });

      await customRepo.create({ history: [], metadata: {} });
      await customRepo.create({ history: [], metadata: {} });

      const stats = customRepo.getStats();
      expect(stats.count).toBe(2);
      expect(stats.maxSessions).toBe(500);
      expect(stats.ttl).toBe(3600000);

      customRepo.destroy();
    });
  });

  describe('destroy', () => {
    it('should clear sessions and stop cleanup timer', async () => {
      const ttlRepo = new MemorySessionRepository({ ttl: 1000 });
      await ttlRepo.create({ history: [], metadata: {} });

      ttlRepo.destroy();

      expect(ttlRepo.getStats().count).toBe(0);
    });
  });

  describe('TTL cleanup', () => {
    it('should automatically clean up expired sessions', async () => {
      vi.useFakeTimers();

      const ttlRepo = new MemorySessionRepository({
        ttl: 100,
        cleanupInterval: 50,
      });

      await ttlRepo.create({ history: [], metadata: {} });
      expect(ttlRepo.getStats().count).toBe(1);

      // Advance time past TTL and cleanup interval
      vi.advanceTimersByTime(150);

      // Trigger cleanup by accessing list (cleanup runs on interval)
      expect(ttlRepo.getStats().count).toBe(0);

      ttlRepo.destroy();
      vi.useRealTimers();
    });
  });
});
