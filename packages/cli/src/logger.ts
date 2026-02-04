/**
 * Simple Console Logger
 * Logs to stderr to keep stdout clean for JSON-RPC
 */

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class ConsoleLogger implements Logger {
  private bindings: Record<string, unknown> = {};

  constructor(private level: LogLevel = LogLevel.INFO, bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, meta);
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, meta);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger(this.level, { ...this.bindings, ...bindings });
  }

  private log(level: string, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const allMeta = { ...this.bindings, ...meta };
    const metaStr = Object.keys(allMeta).length > 0 ? ` ${JSON.stringify(allMeta)}` : '';
    // Log to stderr to keep stdout clean for JSON-RPC
    console.error(`[${timestamp}] ${level}: ${message}${metaStr}`);
  }
}
