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
export declare enum JsonRpcErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    ServerError = -32000
}
/**
 * Type guard for JSON-RPC request
 */
export declare function isJsonRpcRequest(obj: unknown): obj is JsonRpcRequest;
/**
 * Type guard for JSON-RPC notification
 */
export declare function isJsonRpcNotification(obj: unknown): obj is JsonRpcNotification;
/**
 * Type guard for JSON-RPC response
 */
export declare function isJsonRpcResponse(obj: unknown): obj is JsonRpcResponse;
/**
 * Type guard for JSON-RPC error
 */
export declare function isJsonRpcError(obj: unknown): obj is JsonRpcError;
/**
 * Any JSON-RPC message
 */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse | JsonRpcError;
//# sourceMappingURL=jsonrpc.d.ts.map