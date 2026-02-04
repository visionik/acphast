/**
 * Context Utilities
 * Helper functions for managing PipelineContext
 */

import type {
  PipelineContext,
  PipelineError,
  TimingData,
  NodeTiming,
  Logger,
} from './types.js';
import { randomUUID } from 'crypto';

/**
 * Create a new PipelineContext
 */
export function createContext(options: {
  requestId?: string;
  sessionId?: string;
  traceId?: string;
  meta?: Record<string, unknown>;
  logger?: Logger;
  onUpdate?: PipelineContext['onUpdate'];
}): PipelineContext {
  return {
    requestId: options.requestId || randomUUID(),
    sessionId: options.sessionId,
    startTime: Date.now(),
    meta: options.meta || {},
    logger: options.logger,
    onUpdate: options.onUpdate,
    traceId: options.traceId || randomUUID(),
    errors: [],
    timing: {
      nodes: {},
    },
  };
}

/**
 * Create a child context for a node
 */
export function createChildContext(
  parent: PipelineContext,
  nodeId: string,
  options?: {
    spanId?: string;
  }
): PipelineContext {
  return {
    ...parent,
    parentSpanId: parent.spanId,
    spanId: options?.spanId || randomUUID(),
    // Create child logger if available
    logger: parent.logger?.child({ nodeId }),
  };
}

/**
 * Record an error in the context
 */
export function recordError(
  ctx: PipelineContext,
  error: Error | string,
  options?: {
    code?: string;
    nodeId?: string;
    nodeType?: string;
    recoverable?: boolean;
    context?: Record<string, unknown>;
  }
): PipelineError {
  const errObj = error instanceof Error ? error : new Error(error);

  const pipelineError: PipelineError = {
    code: options?.code || 'UNKNOWN_ERROR',
    message: errObj.message,
    nodeId: options?.nodeId,
    nodeType: options?.nodeType,
    timestamp: Date.now(),
    recoverable: options?.recoverable ?? false,
    stack: errObj.stack,
    context: options?.context,
  };

  if (!ctx.errors) {
    ctx.errors = [];
  }
  ctx.errors.push(pipelineError);

  ctx.logger?.error('Pipeline error recorded', {
    code: pipelineError.code,
    message: pipelineError.message,
    nodeId: pipelineError.nodeId,
    recoverable: pipelineError.recoverable,
  });

  return pipelineError;
}

/**
 * Chain errors together
 */
export function chainError(
  current: PipelineError,
  cause: PipelineError
): PipelineError {
  return {
    ...current,
    cause,
  };
}

/**
 * Check if context has errors
 */
export function hasErrors(ctx: PipelineContext): boolean {
  return (ctx.errors?.length || 0) > 0;
}

/**
 * Get non-recoverable errors
 */
export function getFatalErrors(ctx: PipelineContext): PipelineError[] {
  return (ctx.errors || []).filter((e) => !e.recoverable);
}

/**
 * Start timing for a node
 */
export function startNodeTiming(
  ctx: PipelineContext,
  nodeId: string
): NodeTiming {
  const timing: NodeTiming = {
    nodeId,
    startTime: Date.now(),
  };

  if (!ctx.timing) {
    ctx.timing = { nodes: {} };
  }
  ctx.timing.nodes[nodeId] = timing;

  return timing;
}

/**
 * End timing for a node
 */
export function endNodeTiming(ctx: PipelineContext, nodeId: string): NodeTiming | undefined {
  if (!ctx.timing?.nodes[nodeId]) return undefined;

  const timing = ctx.timing.nodes[nodeId];
  timing.endTime = Date.now();
  timing.durationMs = timing.endTime - timing.startTime;

  return timing;
}

/**
 * Finalize context timing
 */
export function finalizeContextTiming(ctx: PipelineContext): TimingData {
  if (!ctx.timing) {
    ctx.timing = { nodes: {} };
  }

  ctx.timing.totalMs = Date.now() - ctx.startTime;

  // Calculate backend time (sum of all node durations)
  let backendMs = 0;
  for (const timing of Object.values(ctx.timing.nodes)) {
    if (timing.durationMs) {
      backendMs += timing.durationMs;
    }
  }
  ctx.timing.backendMs = backendMs;

  return ctx.timing;
}

/**
 * Create a summary of the context for logging
 */
export function contextSummary(ctx: PipelineContext): Record<string, unknown> {
  return {
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    sessionId: ctx.sessionId,
    durationMs: Date.now() - ctx.startTime,
    errorCount: ctx.errors?.length || 0,
    hasErrors: hasErrors(ctx),
    hasFatalErrors: getFatalErrors(ctx).length > 0,
    nodeTimings: ctx.timing?.nodes
      ? Object.fromEntries(
          Object.entries(ctx.timing.nodes).map(([k, v]) => [k, v.durationMs])
        )
      : {},
  };
}

/**
 * Merge metadata into context
 */
export function mergeContextMeta(
  ctx: PipelineContext,
  meta: Record<string, unknown>
): void {
  Object.assign(ctx.meta, meta);
}

/**
 * Set backend timing
 */
export function setBackendTiming(ctx: PipelineContext, backendMs: number): void {
  if (!ctx.timing) {
    ctx.timing = { nodes: {} };
  }
  ctx.timing.backendMs = backendMs;
}

/**
 * Create error codes enum for consistency
 */
export const ErrorCodes = {
  // Transport errors
  TRANSPORT_ERROR: 'TRANSPORT_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // Backend errors
  BACKEND_ERROR: 'BACKEND_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Pipeline errors
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  NODE_ERROR: 'NODE_ERROR',
  ROUTING_ERROR: 'ROUTING_ERROR',

  // Session errors
  SESSION_ERROR: 'SESSION_ERROR',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Internal errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
