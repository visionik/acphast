/**
 * Agent Client Protocol (ACP) Types
 * Based on ACP specification version 2025-01
 */
// ACP Error Codes (from spec)
export var ACPErrorCode;
(function (ACPErrorCode) {
    // JSON-RPC standard errors
    ACPErrorCode[ACPErrorCode["ParseError"] = -32700] = "ParseError";
    ACPErrorCode[ACPErrorCode["InvalidRequest"] = -32600] = "InvalidRequest";
    ACPErrorCode[ACPErrorCode["MethodNotFound"] = -32601] = "MethodNotFound";
    ACPErrorCode[ACPErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    ACPErrorCode[ACPErrorCode["InternalError"] = -32603] = "InternalError";
    // Acphast proxy errors
    ACPErrorCode[ACPErrorCode["BackendUnavailable"] = -32001] = "BackendUnavailable";
    ACPErrorCode[ACPErrorCode["BackendError"] = -32002] = "BackendError";
    ACPErrorCode[ACPErrorCode["CapabilityUnsupported"] = -32003] = "CapabilityUnsupported";
    ACPErrorCode[ACPErrorCode["RateLimited"] = -32004] = "RateLimited";
    ACPErrorCode[ACPErrorCode["ContextExceeded"] = -32005] = "ContextExceeded";
    ACPErrorCode[ACPErrorCode["AuthFailed"] = -32006] = "AuthFailed";
})(ACPErrorCode || (ACPErrorCode = {}));
//# sourceMappingURL=acp.js.map