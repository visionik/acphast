/**
 * HTTP Transport Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { HttpTransport } from '../../packages/transport/src/http.js';
import { createJsonRpcRequest, sendJsonRpcRequest, waitFor } from './helpers.js';

describe('HttpTransport Integration', () => {
  let transport: HttpTransport;
  const PORT = 7890;

  beforeEach(async () => {
    transport = new HttpTransport({
      port: PORT,
      host: 'localhost',
      cors: true,
    });
    await transport.start();
  });

  afterEach(async () => {
    await transport.stop();
  });

  describe('server lifecycle', () => {
    it('should start and become reachable', async () => {
      const response = await fetch(`http://localhost:${PORT}/`);
      expect(response.ok).toBe(true);
      const text = await response.text();
      expect(text).toContain('Acphast HTTP Transport');
    });

    it('should handle multiple start/stop cycles', async () => {
      await transport.stop();
      
      // Start again
      await transport.start();
      const response = await fetch(`http://localhost:${PORT}/`);
      expect(response.ok).toBe(true);
    });

    it('should throw if started twice', async () => {
      await expect(transport.start()).rejects.toThrow('Transport already running');
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS preflight', async () => {
      const response = await fetch(`http://localhost:${PORT}/rpc`, {
        method: 'OPTIONS',
      });
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should include CORS headers on responses', async () => {
      const response = await fetch(`http://localhost:${PORT}/`);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('JSON-RPC handling', () => {
    it('should reject invalid JSON', async () => {
      const response = await fetch(`http://localhost:${PORT}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      expect(response.status).toBe(400);
    });

    it('should reject invalid JSON-RPC request', async () => {
      const response = await fetch(`http://localhost:${PORT}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ not: 'valid' }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe(-32600); // InvalidRequest
    });

    it('should accept valid JSON-RPC request', async () => {
      const requests: any[] = [];
      transport.requests$.subscribe((req) => {
        requests.push(req);
        // Send response
        transport.sendResponse({
          jsonrpc: '2.0',
          result: { status: 'ok' },
          id: req.id,
        });
      });

      const response = await fetch(`http://localhost:${PORT}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createJsonRpcRequest('test/method', { foo: 'bar' }, 1),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toEqual({ status: 'ok' });
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('test/method');
    });
  });

  describe('SSE streaming', () => {
    it('should establish SSE connection', async () => {
      const response = await fetch(`http://localhost:${PORT}/events/test-123`, {
        headers: { Accept: 'text/event-stream' },
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      
      // Close connection
      await response.body?.cancel();
    });

    it('should send notifications to SSE clients', async () => {
      // Connect to SSE
      const controller = new AbortController();
      const response = await fetch(`http://localhost:${PORT}/events/req-456`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      // Set up reader to collect events
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let received = '';

      // Read in background
      const readPromise = (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += decoder.decode(value);
        }
      })();

      // Send notification with requestId to route to correct SSE connection
      await transport.sendNotification({
        method: 'session/update',
        params: { requestId: 'req-456', type: 'content', text: 'Hello' },
      });

      // Wait a bit for event to be received
      await new Promise((r) => setTimeout(r, 100));

      // Abort and wait for reader to finish
      controller.abort();
      await readPromise.catch(() => {}); // Ignore abort error

      // Check that we received the event
      expect(received).toContain('event: notification');
      expect(received).toContain('Hello');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`http://localhost:${PORT}/unknown/path`);
      expect(response.status).toBe(404);
    });
  });
});
