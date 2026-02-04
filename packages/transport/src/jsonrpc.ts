/**
 * JSON-RPC 2.0 Types
 * Spec: https://www.jsonrpc.org/specification
 */

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 Notification (no id, no response expected)
 */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Success Response
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result: unknown;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JsonRpcError {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

/**
 * Standard JSON-RPC error codes
 */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  // Application-specific errors: -32000 to -32099
  ServerError = -32000,
}

/**
 * Type guard for JSON-RPC request
 */
export function isJsonRpcRequest(obj: unknown): obj is JsonRpcRequest {
  if (typeof obj !== 'object' || obj === null) return false;
  const req = obj as Record<string, unknown>;
  return (
    req.jsonrpc === '2.0' &&
    typeof req.method === 'string' &&
    ('id' in req)
  );
}

/**
 * Type guard for JSON-RPC notification
 */
export function isJsonRpcNotification(obj: unknown): obj is JsonRpcNotification {
  if (typeof obj !== 'object' || obj === null) return false;
  const notif = obj as Record<string, unknown>;
  return (
    notif.jsonrpc === '2.0' &&
    typeof notif.method === 'string' &&
    !('id' in notif)
  );
}

/**
 * Type guard for JSON-RPC response
 */
export function isJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const res = obj as Record<string, unknown>;
  return (
    res.jsonrpc === '2.0' &&
    'result' in res &&
    'id' in res
  );
}

/**
 * Type guard for JSON-RPC error
 */
export function isJsonRpcError(obj: unknown): obj is JsonRpcError {
  if (typeof obj !== 'object' || obj === null) return false;
  const err = obj as Record<string, unknown>;
  return (
    err.jsonrpc === '2.0' &&
    typeof err.error === 'object' &&
    err.error !== null &&
    'id' in err
  );
}

/**
 * Any JSON-RPC message
 */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse | JsonRpcError;
