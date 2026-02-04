/**
 * JSON-RPC 2.0 Types
 * Spec: https://www.jsonrpc.org/specification
 */
/**
 * Standard JSON-RPC error codes
 */
export var JsonRpcErrorCode;
(function (JsonRpcErrorCode) {
    JsonRpcErrorCode[JsonRpcErrorCode["ParseError"] = -32700] = "ParseError";
    JsonRpcErrorCode[JsonRpcErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    JsonRpcErrorCode[JsonRpcErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    JsonRpcErrorCode[JsonRpcErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    JsonRpcErrorCode[JsonRpcErrorCode["InternalError"] = -32603] = "InternalError";
    // Application-specific errors: -32000 to -32099
    JsonRpcErrorCode[JsonRpcErrorCode["ServerError"] = -32000] = "ServerError";
})(JsonRpcErrorCode || (JsonRpcErrorCode = {}));
/**
 * Type guard for JSON-RPC request
 */
export function isJsonRpcRequest(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const req = obj;
    return (req.jsonrpc === '2.0' &&
        typeof req.method === 'string' &&
        ('id' in req));
}
/**
 * Type guard for JSON-RPC notification
 */
export function isJsonRpcNotification(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const notif = obj;
    return (notif.jsonrpc === '2.0' &&
        typeof notif.method === 'string' &&
        !('id' in notif));
}
/**
 * Type guard for JSON-RPC response
 */
export function isJsonRpcResponse(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const res = obj;
    return (res.jsonrpc === '2.0' &&
        'result' in res &&
        'id' in res);
}
/**
 * Type guard for JSON-RPC error
 */
export function isJsonRpcError(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const err = obj;
    return (err.jsonrpc === '2.0' &&
        typeof err.error === 'object' &&
        err.error !== null &&
        'id' in err);
}
//# sourceMappingURL=jsonrpc.js.map