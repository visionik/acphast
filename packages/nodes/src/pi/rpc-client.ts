/**
 * Pi RPC Client
 * Low-level client for communicating with Pi CLI via RPC mode
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  PiRpcClientConfig,
  PiRpcCommand,
  PiRpcResponse,
  PiRpcEvent,
  ThinkingLevel,
  PiState,
  PiSessionStats,
  PiCompactionResult,
} from './types.js';

/**
 * Pi RPC Client
 * 
 * Spawns and manages a Pi CLI process in RPC mode, handles JSON-RPC
 * communication over stdin/stdout, and provides event streaming.
 */
export class PiRpcClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<
    string,
    { resolve: (v: PiRpcResponse) => void; reject: (e: Error) => void }
  >();
  private eventHandlers: Array<(ev: PiRpcEvent) => void> = [];
  private terminated = false;

  private constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;

    // Setup line-delimited JSON reader
    const rl = readline.createInterface({ input: child.stdout });
    
    rl.on('line', (line) => {
      if (!line.trim()) return;

      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch (err) {
        // Ignore malformed JSON
        console.warn('[PiRpcClient] Malformed JSON:', line);
        return;
      }

      // Handle responses (have matching request ID)
      if (
        typeof msg === 'object' &&
        msg !== null &&
        'type' in msg &&
        msg.type === 'response'
      ) {
        const response = msg as PiRpcResponse;
        const id = response.id;
        
        if (id && this.pending.has(id)) {
          const handler = this.pending.get(id)!;
          this.pending.delete(id);
          handler.resolve(response);
          return;
        }
      }

      // Handle events (broadcast to all handlers)
      if (typeof msg === 'object' && msg !== null) {
        for (const handler of this.eventHandlers) {
          handler(msg as PiRpcEvent);
        }
      }
    });

    // Handle process exit
    child.on('exit', (code, signal) => {
      const err = new Error(
        `Pi process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`
      );
      
      // Reject all pending requests
      for (const [id, handler] of this.pending) {
        handler.reject(err);
        this.pending.delete(id);
      }
      
      this.terminated = true;
    });

    // Capture stderr for debugging
    child.stderr.on('data', (data) => {
      // Pi may write errors to stderr; we leave them visible
      // for the parent process to capture if needed
    });
  }

  /**
   * Spawn a new Pi RPC process
   */
  static async spawn(config: PiRpcClientConfig): Promise<PiRpcClient> {
    const cmd = config.piCommand ?? 'pi';
    const args = ['--mode', 'rpc'];

    if (config.sessionPath) {
      args.push('--session', config.sessionPath);
    }

    const child = spawn(cmd, args, {
      cwd: config.cwd,
      stdio: 'pipe',
      env: process.env,
    });

    const client = new PiRpcClient(child);

    // Best-effort handshake: create session directory if needed
    try {
      const state = (await client.getState()) as PiState;
      const sessionFile = state?.sessionFile;
      
      if (sessionFile && typeof sessionFile === 'string') {
        const dir = dirname(sessionFile);
        mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      // Ignore handshake errors
      console.warn('[PiRpcClient] Handshake warning:', err);
    }

    return client;
  }

  /**
   * Register an event handler
   * @returns Cleanup function to unregister the handler
   */
  onEvent(handler: (event: PiRpcEvent) => void): () => void {
    this.eventHandlers.push(handler);
    
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Send a command and await response
   */
  async request(command: PiRpcCommand): Promise<PiRpcResponse> {
    if (this.terminated) {
      throw new Error('Pi process has been terminated');
    }

    const id = randomUUID();
    const commandWithId = { ...command, id };
    const line = JSON.stringify(commandWithId) + '\n';

    return new Promise<PiRpcResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      this.child.stdin.write(line, (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * Send a prompt to Pi
   */
  async prompt(message: string, attachments: unknown[] = []): Promise<void> {
    const response = await this.request({
      type: 'prompt',
      message,
      attachments,
    });

    if (!response.success) {
      throw new Error(
        `Pi prompt failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }
  }

  /**
   * Abort current generation
   */
  async abort(): Promise<void> {
    const response = await this.request({ type: 'abort' });

    if (!response.success) {
      throw new Error(
        `Pi abort failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }
  }

  /**
   * Get current Pi state
   */
  async getState(): Promise<PiState> {
    const response = await this.request({ type: 'get_state' });

    if (!response.success) {
      throw new Error(
        `Pi get_state failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }

    return response.data as PiState;
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<unknown> {
    const response = await this.request({ type: 'get_available_models' });

    if (!response.success) {
      throw new Error(
        `Pi get_available_models failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }

    return response.data;
  }

  /**
   * Set active model
   */
  async setModel(provider: string, modelId: string): Promise<void> {
    const response = await this.request({
      type: 'set_model',
      provider,
      modelId,
    });

    if (!response.success) {
      throw new Error(
        `Pi set_model failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }
  }

  /**
   * Set thinking level
   */
  async setThinkingLevel(level: ThinkingLevel): Promise<void> {
    const response = await this.request({
      type: 'set_thinking_level',
      level,
    });

    if (!response.success) {
      throw new Error(
        `Pi set_thinking_level failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }
  }

  /**
   * Set follow-up mode
   */
  async setFollowUpMode(mode: 'all' | 'one-at-a-time'): Promise<void> {
    const response = await this.request({
      type: 'set_follow_up_mode',
      mode,
    });

    if (!response.success) {
      throw new Error(
        `Pi set_follow_up_mode failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }
  }

  /**
   * Set steering mode
   */
  async setSteeringMode(mode: 'all' | 'one-at-a-time'): Promise<void> {
    const response = await this.request({
      type: 'set_steering_mode',
      mode,
    });

    if (!response.success) {
      throw new Error(
        `Pi set_steering_mode failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }
  }

  /**
   * Compact conversation context
   */
  async compact(customInstructions?: string): Promise<PiCompactionResult> {
    const response = await this.request({
      type: 'compact',
      customInstructions,
    });

    if (!response.success) {
      throw new Error(
        `Pi compact failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }

    return response.data as PiCompactionResult;
  }

  /**
   * Set automatic compaction
   */
  async setAutoCompaction(enabled: boolean): Promise<void> {
    const response = await this.request({
      type: 'set_auto_compaction',
      enabled,
    });

    if (!response.success) {
      throw new Error(
        `Pi set_auto_compaction failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<PiSessionStats> {
    const response = await this.request({ type: 'get_session_stats' });

    if (!response.success) {
      throw new Error(
        `Pi get_session_stats failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }

    return response.data as PiSessionStats;
  }

  /**
   * Export session to HTML
   */
  async exportHtml(outputPath?: string): Promise<{ path: string }> {
    const response = await this.request({
      type: 'export_html',
      outputPath,
    });

    if (!response.success) {
      throw new Error(
        `Pi export_html failed: ${response.error ?? JSON.stringify(response.data)}`
      );
    }

    const data = response.data as { path?: string };
    return { path: data?.path ?? '' };
  }

  /**
   * Switch to a different session
   */
  async switchSession(sessionPath: string): Promise<void> {
    const response = await this.request({
      type: 'switch_session',
      sessionPath,
    });

    if (!response.success) {
      throw new Error(
        `Pi switch_session failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }
  }

  /**
   * Get conversation messages
   */
  async getMessages(): Promise<unknown> {
    const response = await this.request({ type: 'get_messages' });

    if (!response.success) {
      throw new Error(
        `Pi get_messages failed: ${
          response.error ?? JSON.stringify(response.data)
        }`
      );
    }

    return response.data;
  }

  /**
   * Terminate the Pi process
   */
  async terminate(): Promise<void> {
    if (this.terminated) {
      return;
    }

    // Clear pending requests
    const err = new Error('Pi client terminated by user');
    for (const [id, handler] of this.pending) {
      handler.reject(err);
      this.pending.delete(id);
    }

    // Clear event handlers
    this.eventHandlers = [];

    // Kill process
    this.child.kill();
    this.terminated = true;
  }

  /**
   * Check if process is still running
   */
  isAlive(): boolean {
    return !this.terminated && this.child.exitCode === null;
  }
}
