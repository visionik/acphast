/**
 * Tracing Module
 * Request tracing, timing, and span tracking for pipeline execution
 */

import type { Logger } from './types.js';

/**
 * Span status
 */
export type SpanStatus = 'pending' | 'active' | 'completed' | 'error';

/**
 * Span represents a unit of work in the pipeline
 */
export interface Span {
  /** Unique span ID */
  id: string;

  /** Parent span ID (for nested spans) */
  parentId?: string;

  /** Span name (usually node name) */
  name: string;

  /** Span status */
  status: SpanStatus;

  /** Start timestamp (ms) */
  startTime: number;

  /** End timestamp (ms) */
  endTime?: number;

  /** Duration in milliseconds */
  duration?: number;

  /** Span attributes */
  attributes: Record<string, unknown>;

  /** Events that occurred during the span */
  events: SpanEvent[];

  /** Error if status is 'error' */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Event within a span
 */
export interface SpanEvent {
  /** Event name */
  name: string;

  /** Timestamp */
  timestamp: number;

  /** Event attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Trace represents a complete request trace
 */
export interface Trace {
  /** Unique trace ID */
  traceId: string;

  /** Request ID this trace belongs to */
  requestId: string;

  /** Root span ID */
  rootSpanId?: string;

  /** All spans in this trace */
  spans: Map<string, Span>;

  /** Trace start time */
  startTime: number;

  /** Trace end time */
  endTime?: number;

  /** Total duration */
  duration?: number;

  /** Trace attributes */
  attributes: Record<string, unknown>;
}

/**
 * Tracer class for managing traces and spans
 */
export class Tracer {
  private traces = new Map<string, Trace>();
  private activeSpans = new Map<string, string>(); // spanId -> traceId
  private logger?: Logger;
  private idCounter = 0;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${++this.idCounter}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Start a new trace for a request
   */
  startTrace(requestId: string, attributes?: Record<string, unknown>): Trace {
    const traceId = this.generateId();
    const trace: Trace = {
      traceId,
      requestId,
      spans: new Map(),
      startTime: Date.now(),
      attributes: attributes || {},
    };

    this.traces.set(traceId, trace);
    this.logger?.debug('Started trace', { traceId, requestId });

    return trace;
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): Trace | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    this.logger?.debug('Ended trace', {
      traceId,
      duration: trace.duration,
      spanCount: trace.spans.size,
    });

    return trace;
  }

  /**
   * Get a trace by ID
   */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Start a new span within a trace
   */
  startSpan(
    traceId: string,
    name: string,
    options?: {
      parentId?: string;
      attributes?: Record<string, unknown>;
    }
  ): Span | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    const spanId = this.generateId();
    const span: Span = {
      id: spanId,
      parentId: options?.parentId,
      name,
      status: 'active',
      startTime: Date.now(),
      attributes: options?.attributes || {},
      events: [],
    };

    // Set root span if not set
    if (!trace.rootSpanId) {
      trace.rootSpanId = spanId;
    }

    trace.spans.set(spanId, span);
    this.activeSpans.set(spanId, traceId);

    this.logger?.debug('Started span', { traceId, spanId, name });

    return span;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status?: SpanStatus): Span | undefined {
    const traceId = this.activeSpans.get(spanId);
    if (!traceId) return undefined;

    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    const span = trace.spans.get(spanId);
    if (!span) return undefined;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status || 'completed';

    this.activeSpans.delete(spanId);

    this.logger?.debug('Ended span', {
      spanId,
      name: span.name,
      duration: span.duration,
      status: span.status,
    });

    return span;
  }

  /**
   * Record an error on a span
   */
  recordError(
    spanId: string,
    error: Error | string,
    code?: string
  ): Span | undefined {
    const traceId = this.activeSpans.get(spanId);
    if (!traceId) return undefined;

    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    const span = trace.spans.get(spanId);
    if (!span) return undefined;

    const errObj = error instanceof Error ? error : new Error(error);
    span.error = {
      message: errObj.message,
      code,
      stack: errObj.stack,
    };

    // Add error event
    span.events.push({
      name: 'error',
      timestamp: Date.now(),
      attributes: {
        message: errObj.message,
        code,
      },
    });

    this.logger?.debug('Recorded error on span', {
      spanId,
      error: errObj.message,
    });

    return span;
  }

  /**
   * Add an event to a span
   */
  addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, unknown>
  ): void {
    const traceId = this.activeSpans.get(spanId);
    if (!traceId) return;

    const trace = this.traces.get(traceId);
    if (!trace) return;

    const span = trace.spans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Set span attributes
   */
  setSpanAttributes(
    spanId: string,
    attributes: Record<string, unknown>
  ): void {
    const traceId = this.activeSpans.get(spanId);
    if (!traceId) return;

    const trace = this.traces.get(traceId);
    if (!trace) return;

    const span = trace.spans.get(spanId);
    if (!span) return;

    Object.assign(span.attributes, attributes);
  }

  /**
   * Export trace as JSON (for debugging/logging)
   */
  exportTrace(traceId: string): object | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;

    return {
      traceId: trace.traceId,
      requestId: trace.requestId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.duration,
      attributes: trace.attributes,
      spans: Array.from(trace.spans.values()).map((span) => ({
        id: span.id,
        parentId: span.parentId,
        name: span.name,
        status: span.status,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        attributes: span.attributes,
        events: span.events,
        error: span.error,
      })),
    };
  }

  /**
   * Clear completed traces (garbage collection)
   */
  clearCompletedTraces(maxAge?: number): number {
    const now = Date.now();
    const threshold = maxAge || 60000; // Default 1 minute
    let cleared = 0;

    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.endTime && now - trace.endTime > threshold) {
        this.traces.delete(traceId);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger?.debug('Cleared completed traces', { count: cleared });
    }

    return cleared;
  }

  /**
   * Get trace statistics
   */
  getStats(): {
    activeTraces: number;
    activeSpans: number;
    totalTraces: number;
  } {
    return {
      activeTraces: Array.from(this.traces.values()).filter(
        (t) => !t.endTime
      ).length,
      activeSpans: this.activeSpans.size,
      totalTraces: this.traces.size,
    };
  }
}

/**
 * Global tracer instance
 */
export const globalTracer = new Tracer();

/**
 * Helper to create a traced execution block
 */
export async function withSpan<T>(
  tracer: Tracer,
  traceId: string,
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    parentId?: string;
    attributes?: Record<string, unknown>;
  }
): Promise<T> {
  const span = tracer.startSpan(traceId, name, options);
  if (!span) {
    // No trace, just execute
    return fn({} as Span);
  }

  try {
    const result = await fn(span);
    tracer.endSpan(span.id, 'completed');
    return result;
  } catch (error) {
    tracer.recordError(span.id, error as Error);
    tracer.endSpan(span.id, 'error');
    throw error;
  }
}
