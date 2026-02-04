/**
 * Integration Test Helpers
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Wait for server to be ready on a port
 */
export async function waitForPort(port: number, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for port ${port}`);
}

/**
 * Create a JSON-RPC request body
 */
export function createJsonRpcRequest(
  method: string,
  params: Record<string, unknown>,
  id: string | number = 1
): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
    id,
  });
}

/**
 * Send JSON-RPC request to HTTP server
 */
export async function sendJsonRpcRequest(
  port: number,
  method: string,
  params: Record<string, unknown>,
  id: string | number = 1
): Promise<{
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}> {
  const response = await fetch(`http://localhost:${port}/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: createJsonRpcRequest(method, params, id),
  });

  return response.json();
}

/**
 * Mock Anthropic API server for testing
 */
export class MockAnthropicServer {
  private server: any = null;
  private responses: Map<string, unknown> = new Map();

  async start(port = 9999): Promise<void> {
    const http = await import('http');
    
    this.server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        
        // Return mock response
        const mockResponse = {
          id: 'msg_mock',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Mock response from Anthropic' }],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        };
        
        res.end(JSON.stringify(mockResponse));
      });
    });

    await new Promise<void>((resolve) => {
      this.server.listen(port, resolve);
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

/**
 * Spawn server process and wait for it to be ready
 */
export async function spawnServer(
  options: {
    port?: number;
    env?: Record<string, string>;
  } = {}
): Promise<ChildProcess> {
  const { port = 6809, env = {} } = options;

  const proc = spawn('npx', ['tsx', 'packages/cli/src/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
      TRANSPORT: 'http',
      PORT: String(port),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for server to be ready
  await waitForPort(port, 10000);

  return proc;
}

/**
 * Kill a process and wait for it to exit
 */
export async function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      proc.kill('SIGKILL');
    }, 5000);
  });
}
