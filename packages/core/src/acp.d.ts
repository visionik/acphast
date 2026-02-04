/**
 * Agent Client Protocol (ACP) Types
 * Based on ACP specification version 2025-01
 */
export interface ACPRequest {
    id: string | number;
    method: string;
    params: Record<string, unknown>;
}
export interface ACPResponse {
    id: string | number;
    result?: unknown;
    error?: ACPError;
}
export interface ACPNotification {
    method: string;
    params: Record<string, unknown>;
}
export interface ACPError {
    code: number;
    message: string;
    data?: unknown;
}
export declare enum ACPErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    BackendUnavailable = -32001,
    BackendError = -32002,
    CapabilityUnsupported = -32003,
    RateLimited = -32004,
    ContextExceeded = -32005,
    AuthFailed = -32006
}
export type ContentBlock = TextContent | ImageContent | ResourceContent | ToolUseContent | ToolResultContent;
export interface TextContent {
    type: 'text';
    text: string;
    _meta?: Record<string, unknown>;
}
export interface ImageContent {
    type: 'image';
    data: string;
    mimeType: string;
    _meta?: Record<string, unknown>;
}
export interface ResourceContent {
    type: 'resource';
    resource: {
        uri: string;
        mimeType?: string;
        text?: string;
    };
    _meta?: Record<string, unknown>;
}
export interface ToolUseContent {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
    _meta?: Record<string, unknown>;
}
export interface ToolResultContent {
    type: 'tool_result';
    toolCallId: string;
    content: ContentBlock[];
    isError?: boolean;
    _meta?: Record<string, unknown>;
}
export interface SessionNewParams {
    cwd?: string;
    mcpServers?: unknown[];
    _meta?: Record<string, unknown>;
}
export interface SessionPromptParams {
    sessionId: string;
    prompt: ContentBlock[];
    _meta?: Record<string, unknown>;
}
export interface SessionLoadParams {
    sessionId: string;
}
export type SessionUpdate = ContentChunkUpdate | ThoughtChunkUpdate | ToolCallUpdate | ToolResultUpdate | UsageUpdate;
export interface ContentChunkUpdate {
    type: 'content_chunk';
    content: ContentBlock;
    _meta?: Record<string, unknown>;
}
export interface ThoughtChunkUpdate {
    type: 'thought_chunk';
    content: TextContent;
    _meta?: Record<string, unknown>;
}
export interface ToolCallUpdate {
    type: 'tool_call';
    toolCall: {
        id: string;
        name: string;
        arguments?: Record<string, unknown>;
    };
    _meta?: Record<string, unknown>;
}
export interface ToolResultUpdate {
    type: 'tool_result';
    toolCallId: string;
    content: ContentBlock[];
    _meta?: Record<string, unknown>;
}
export interface UsageUpdate {
    type: 'usage';
    _meta: Record<string, unknown>;
}
export interface PromptResponse {
    stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'cancelled' | 'error';
    _meta?: Record<string, unknown>;
}
export interface AgentCapabilities {
    loadSession?: boolean;
    promptCapabilities?: {
        audio?: boolean;
        image?: boolean;
        embeddedContext?: boolean;
    };
    sessionCapabilities?: {
        modes?: boolean;
    };
    _meta?: Record<string, unknown>;
}
//# sourceMappingURL=acp.d.ts.map