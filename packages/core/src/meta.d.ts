/**
 * Metadata Schemas for Provider-Specific Extensions
 * Uses Zod for runtime validation
 */
import { z } from 'zod';
import type { MetadataPolicy } from './types.js';
/**
 * Proxy metadata schema
 */
export declare const ProxyMetaSchema: z.ZodObject<{
    version: z.ZodOptional<z.ZodString>;
    backend: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
    traceId: z.ZodOptional<z.ZodString>;
    startTime: z.ZodOptional<z.ZodNumber>;
    usage: z.ZodOptional<z.ZodObject<{
        inputTokens: z.ZodOptional<z.ZodNumber>;
        outputTokens: z.ZodOptional<z.ZodNumber>;
        totalTokens: z.ZodOptional<z.ZodNumber>;
        thinkingTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
        totalTokens?: number | undefined;
        thinkingTokens?: number | undefined;
    }, {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
        totalTokens?: number | undefined;
        thinkingTokens?: number | undefined;
    }>>;
    cost: z.ZodOptional<z.ZodObject<{
        inputCost: z.ZodOptional<z.ZodNumber>;
        outputCost: z.ZodOptional<z.ZodNumber>;
        totalCost: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        inputCost?: number | undefined;
        outputCost?: number | undefined;
        totalCost?: number | undefined;
        currency?: string | undefined;
    }, {
        inputCost?: number | undefined;
        outputCost?: number | undefined;
        totalCost?: number | undefined;
        currency?: string | undefined;
    }>>;
    timing: z.ZodOptional<z.ZodObject<{
        queuedMs: z.ZodOptional<z.ZodNumber>;
        processingMs: z.ZodOptional<z.ZodNumber>;
        totalMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        queuedMs?: number | undefined;
        processingMs?: number | undefined;
        totalMs?: number | undefined;
    }, {
        queuedMs?: number | undefined;
        processingMs?: number | undefined;
        totalMs?: number | undefined;
    }>>;
    retryAfterMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    usage?: {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
        totalTokens?: number | undefined;
        thinkingTokens?: number | undefined;
    } | undefined;
    version?: string | undefined;
    backend?: string | undefined;
    model?: string | undefined;
    requestId?: string | undefined;
    traceId?: string | undefined;
    startTime?: number | undefined;
    cost?: {
        inputCost?: number | undefined;
        outputCost?: number | undefined;
        totalCost?: number | undefined;
        currency?: string | undefined;
    } | undefined;
    timing?: {
        queuedMs?: number | undefined;
        processingMs?: number | undefined;
        totalMs?: number | undefined;
    } | undefined;
    retryAfterMs?: number | undefined;
}, {
    usage?: {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
        totalTokens?: number | undefined;
        thinkingTokens?: number | undefined;
    } | undefined;
    version?: string | undefined;
    backend?: string | undefined;
    model?: string | undefined;
    requestId?: string | undefined;
    traceId?: string | undefined;
    startTime?: number | undefined;
    cost?: {
        inputCost?: number | undefined;
        outputCost?: number | undefined;
        totalCost?: number | undefined;
        currency?: string | undefined;
    } | undefined;
    timing?: {
        queuedMs?: number | undefined;
        processingMs?: number | undefined;
        totalMs?: number | undefined;
    } | undefined;
    retryAfterMs?: number | undefined;
}>;
/**
 * Anthropic metadata schema
 */
export declare const AnthropicMetaSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    thinking: z.ZodOptional<z.ZodEnum<["disabled", "enabled", "streaming"]>>;
    maxThinkingTokens: z.ZodOptional<z.ZodNumber>;
    thinkingBlockId: z.ZodOptional<z.ZodString>;
    thinkingBlockIndex: z.ZodOptional<z.ZodNumber>;
    cacheControl: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"ephemeral">;
        ttl: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "ephemeral";
        ttl?: number | undefined;
    }, {
        type: "ephemeral";
        ttl?: number | undefined;
    }>>;
    cacheReadInputTokens: z.ZodOptional<z.ZodNumber>;
    cacheCreationInputTokens: z.ZodOptional<z.ZodNumber>;
    stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    interleaved_thinking: z.ZodOptional<z.ZodBoolean>;
    stopReason: z.ZodOptional<z.ZodString>;
    stopSequence: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    maxTokens?: number | undefined;
    thinking?: "disabled" | "enabled" | "streaming" | undefined;
    maxThinkingTokens?: number | undefined;
    thinkingBlockId?: string | undefined;
    thinkingBlockIndex?: number | undefined;
    cacheControl?: {
        type: "ephemeral";
        ttl?: number | undefined;
    } | undefined;
    cacheReadInputTokens?: number | undefined;
    cacheCreationInputTokens?: number | undefined;
    stopSequences?: string[] | undefined;
    interleaved_thinking?: boolean | undefined;
    stopReason?: string | undefined;
    stopSequence?: string | null | undefined;
}, {
    model?: string | undefined;
    maxTokens?: number | undefined;
    thinking?: "disabled" | "enabled" | "streaming" | undefined;
    maxThinkingTokens?: number | undefined;
    thinkingBlockId?: string | undefined;
    thinkingBlockIndex?: number | undefined;
    cacheControl?: {
        type: "ephemeral";
        ttl?: number | undefined;
    } | undefined;
    cacheReadInputTokens?: number | undefined;
    cacheCreationInputTokens?: number | undefined;
    stopSequences?: string[] | undefined;
    interleaved_thinking?: boolean | undefined;
    stopReason?: string | undefined;
    stopSequence?: string | null | undefined;
}>;
/**
 * OpenAI metadata schema
 */
export declare const OpenAIMetaSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    reasoning: z.ZodOptional<z.ZodObject<{
        effort: z.ZodEnum<["low", "medium", "high"]>;
        summary: z.ZodOptional<z.ZodEnum<["disabled", "auto", "always"]>>;
    }, "strip", z.ZodTypeAny, {
        effort: "low" | "medium" | "high";
        summary?: "disabled" | "auto" | "always" | undefined;
    }, {
        effort: "low" | "medium" | "high";
        summary?: "disabled" | "auto" | "always" | undefined;
    }>>;
    reasoningTokens: z.ZodOptional<z.ZodNumber>;
    reasoningSummary: z.ZodOptional<z.ZodBoolean>;
    builtinTools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["web_search", "code_interpreter", "file_search"]>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "web_search" | "code_interpreter" | "file_search";
        config?: Record<string, unknown> | undefined;
    }, {
        type: "web_search" | "code_interpreter" | "file_search";
        config?: Record<string, unknown> | undefined;
    }>, "many">>;
    builtinTool: z.ZodOptional<z.ZodBoolean>;
    serverExecuted: z.ZodOptional<z.ZodBoolean>;
    fileIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    vectorStoreIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    responseFormat: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["text", "json_object", "json_schema"]>;
        schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "json_object" | "json_schema";
        schema?: Record<string, unknown> | undefined;
    }, {
        type: "text" | "json_object" | "json_schema";
        schema?: Record<string, unknown> | undefined;
    }>>;
    prediction: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"content">;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "content";
        content: string;
    }, {
        type: "content";
        content: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    reasoning?: {
        effort: "low" | "medium" | "high";
        summary?: "disabled" | "auto" | "always" | undefined;
    } | undefined;
    reasoningTokens?: number | undefined;
    reasoningSummary?: boolean | undefined;
    builtinTools?: {
        type: "web_search" | "code_interpreter" | "file_search";
        config?: Record<string, unknown> | undefined;
    }[] | undefined;
    builtinTool?: boolean | undefined;
    serverExecuted?: boolean | undefined;
    fileIds?: string[] | undefined;
    vectorStoreIds?: string[] | undefined;
    responseFormat?: {
        type: "text" | "json_object" | "json_schema";
        schema?: Record<string, unknown> | undefined;
    } | undefined;
    prediction?: {
        type: "content";
        content: string;
    } | undefined;
}, {
    model?: string | undefined;
    reasoning?: {
        effort: "low" | "medium" | "high";
        summary?: "disabled" | "auto" | "always" | undefined;
    } | undefined;
    reasoningTokens?: number | undefined;
    reasoningSummary?: boolean | undefined;
    builtinTools?: {
        type: "web_search" | "code_interpreter" | "file_search";
        config?: Record<string, unknown> | undefined;
    }[] | undefined;
    builtinTool?: boolean | undefined;
    serverExecuted?: boolean | undefined;
    fileIds?: string[] | undefined;
    vectorStoreIds?: string[] | undefined;
    responseFormat?: {
        type: "text" | "json_object" | "json_schema";
        schema?: Record<string, unknown> | undefined;
    } | undefined;
    prediction?: {
        type: "content";
        content: string;
    } | undefined;
}>;
/**
 * Ollama metadata schema
 */
export declare const OllamaMetaSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    topK: z.ZodOptional<z.ZodNumber>;
    repeatPenalty: z.ZodOptional<z.ZodNumber>;
    contextLength: z.ZodOptional<z.ZodNumber>;
    numPredict: z.ZodOptional<z.ZodNumber>;
    numGpu: z.ZodOptional<z.ZodNumber>;
    mainGpu: z.ZodOptional<z.ZodNumber>;
    keepAlive: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
    topK?: number | undefined;
    repeatPenalty?: number | undefined;
    contextLength?: number | undefined;
    numPredict?: number | undefined;
    numGpu?: number | undefined;
    mainGpu?: number | undefined;
    keepAlive?: string | undefined;
}, {
    model?: string | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
    topK?: number | undefined;
    repeatPenalty?: number | undefined;
    contextLength?: number | undefined;
    numPredict?: number | undefined;
    numGpu?: number | undefined;
    mainGpu?: number | undefined;
    keepAlive?: string | undefined;
}>;
/**
 * Complete metadata schema
 */
export declare const MetadataSchema: z.ZodObject<{
    proxy: z.ZodOptional<z.ZodObject<{
        version: z.ZodOptional<z.ZodString>;
        backend: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        requestId: z.ZodOptional<z.ZodString>;
        traceId: z.ZodOptional<z.ZodString>;
        startTime: z.ZodOptional<z.ZodNumber>;
        usage: z.ZodOptional<z.ZodObject<{
            inputTokens: z.ZodOptional<z.ZodNumber>;
            outputTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodOptional<z.ZodNumber>;
            thinkingTokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        }, {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        }>>;
        cost: z.ZodOptional<z.ZodObject<{
            inputCost: z.ZodOptional<z.ZodNumber>;
            outputCost: z.ZodOptional<z.ZodNumber>;
            totalCost: z.ZodOptional<z.ZodNumber>;
            currency: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        }, {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        }>>;
        timing: z.ZodOptional<z.ZodObject<{
            queuedMs: z.ZodOptional<z.ZodNumber>;
            processingMs: z.ZodOptional<z.ZodNumber>;
            totalMs: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        }, {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        }>>;
        retryAfterMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        usage?: {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        } | undefined;
        version?: string | undefined;
        backend?: string | undefined;
        model?: string | undefined;
        requestId?: string | undefined;
        traceId?: string | undefined;
        startTime?: number | undefined;
        cost?: {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        timing?: {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        } | undefined;
        retryAfterMs?: number | undefined;
    }, {
        usage?: {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        } | undefined;
        version?: string | undefined;
        backend?: string | undefined;
        model?: string | undefined;
        requestId?: string | undefined;
        traceId?: string | undefined;
        startTime?: number | undefined;
        cost?: {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        timing?: {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        } | undefined;
        retryAfterMs?: number | undefined;
    }>>;
    anthropic: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        thinking: z.ZodOptional<z.ZodEnum<["disabled", "enabled", "streaming"]>>;
        maxThinkingTokens: z.ZodOptional<z.ZodNumber>;
        thinkingBlockId: z.ZodOptional<z.ZodString>;
        thinkingBlockIndex: z.ZodOptional<z.ZodNumber>;
        cacheControl: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"ephemeral">;
            ttl: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "ephemeral";
            ttl?: number | undefined;
        }, {
            type: "ephemeral";
            ttl?: number | undefined;
        }>>;
        cacheReadInputTokens: z.ZodOptional<z.ZodNumber>;
        cacheCreationInputTokens: z.ZodOptional<z.ZodNumber>;
        stopSequences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        interleaved_thinking: z.ZodOptional<z.ZodBoolean>;
        stopReason: z.ZodOptional<z.ZodString>;
        stopSequence: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        maxTokens?: number | undefined;
        thinking?: "disabled" | "enabled" | "streaming" | undefined;
        maxThinkingTokens?: number | undefined;
        thinkingBlockId?: string | undefined;
        thinkingBlockIndex?: number | undefined;
        cacheControl?: {
            type: "ephemeral";
            ttl?: number | undefined;
        } | undefined;
        cacheReadInputTokens?: number | undefined;
        cacheCreationInputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        interleaved_thinking?: boolean | undefined;
        stopReason?: string | undefined;
        stopSequence?: string | null | undefined;
    }, {
        model?: string | undefined;
        maxTokens?: number | undefined;
        thinking?: "disabled" | "enabled" | "streaming" | undefined;
        maxThinkingTokens?: number | undefined;
        thinkingBlockId?: string | undefined;
        thinkingBlockIndex?: number | undefined;
        cacheControl?: {
            type: "ephemeral";
            ttl?: number | undefined;
        } | undefined;
        cacheReadInputTokens?: number | undefined;
        cacheCreationInputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        interleaved_thinking?: boolean | undefined;
        stopReason?: string | undefined;
        stopSequence?: string | null | undefined;
    }>>;
    openai: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        reasoning: z.ZodOptional<z.ZodObject<{
            effort: z.ZodEnum<["low", "medium", "high"]>;
            summary: z.ZodOptional<z.ZodEnum<["disabled", "auto", "always"]>>;
        }, "strip", z.ZodTypeAny, {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        }, {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        }>>;
        reasoningTokens: z.ZodOptional<z.ZodNumber>;
        reasoningSummary: z.ZodOptional<z.ZodBoolean>;
        builtinTools: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["web_search", "code_interpreter", "file_search"]>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }, {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }>, "many">>;
        builtinTool: z.ZodOptional<z.ZodBoolean>;
        serverExecuted: z.ZodOptional<z.ZodBoolean>;
        fileIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        vectorStoreIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        responseFormat: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["text", "json_object", "json_schema"]>;
            schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        }, {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        }>>;
        prediction: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"content">;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "content";
            content: string;
        }, {
            type: "content";
            content: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        reasoning?: {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        } | undefined;
        reasoningTokens?: number | undefined;
        reasoningSummary?: boolean | undefined;
        builtinTools?: {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }[] | undefined;
        builtinTool?: boolean | undefined;
        serverExecuted?: boolean | undefined;
        fileIds?: string[] | undefined;
        vectorStoreIds?: string[] | undefined;
        responseFormat?: {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        } | undefined;
        prediction?: {
            type: "content";
            content: string;
        } | undefined;
    }, {
        model?: string | undefined;
        reasoning?: {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        } | undefined;
        reasoningTokens?: number | undefined;
        reasoningSummary?: boolean | undefined;
        builtinTools?: {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }[] | undefined;
        builtinTool?: boolean | undefined;
        serverExecuted?: boolean | undefined;
        fileIds?: string[] | undefined;
        vectorStoreIds?: string[] | undefined;
        responseFormat?: {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        } | undefined;
        prediction?: {
            type: "content";
            content: string;
        } | undefined;
    }>>;
    ollama: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        topK: z.ZodOptional<z.ZodNumber>;
        repeatPenalty: z.ZodOptional<z.ZodNumber>;
        contextLength: z.ZodOptional<z.ZodNumber>;
        numPredict: z.ZodOptional<z.ZodNumber>;
        numGpu: z.ZodOptional<z.ZodNumber>;
        mainGpu: z.ZodOptional<z.ZodNumber>;
        keepAlive: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        repeatPenalty?: number | undefined;
        contextLength?: number | undefined;
        numPredict?: number | undefined;
        numGpu?: number | undefined;
        mainGpu?: number | undefined;
        keepAlive?: string | undefined;
    }, {
        model?: string | undefined;
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        repeatPenalty?: number | undefined;
        contextLength?: number | undefined;
        numPredict?: number | undefined;
        numGpu?: number | undefined;
        mainGpu?: number | undefined;
        keepAlive?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    proxy?: {
        usage?: {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        } | undefined;
        version?: string | undefined;
        backend?: string | undefined;
        model?: string | undefined;
        requestId?: string | undefined;
        traceId?: string | undefined;
        startTime?: number | undefined;
        cost?: {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        timing?: {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        } | undefined;
        retryAfterMs?: number | undefined;
    } | undefined;
    anthropic?: {
        model?: string | undefined;
        maxTokens?: number | undefined;
        thinking?: "disabled" | "enabled" | "streaming" | undefined;
        maxThinkingTokens?: number | undefined;
        thinkingBlockId?: string | undefined;
        thinkingBlockIndex?: number | undefined;
        cacheControl?: {
            type: "ephemeral";
            ttl?: number | undefined;
        } | undefined;
        cacheReadInputTokens?: number | undefined;
        cacheCreationInputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        interleaved_thinking?: boolean | undefined;
        stopReason?: string | undefined;
        stopSequence?: string | null | undefined;
    } | undefined;
    openai?: {
        model?: string | undefined;
        reasoning?: {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        } | undefined;
        reasoningTokens?: number | undefined;
        reasoningSummary?: boolean | undefined;
        builtinTools?: {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }[] | undefined;
        builtinTool?: boolean | undefined;
        serverExecuted?: boolean | undefined;
        fileIds?: string[] | undefined;
        vectorStoreIds?: string[] | undefined;
        responseFormat?: {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        } | undefined;
        prediction?: {
            type: "content";
            content: string;
        } | undefined;
    } | undefined;
    ollama?: {
        model?: string | undefined;
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        repeatPenalty?: number | undefined;
        contextLength?: number | undefined;
        numPredict?: number | undefined;
        numGpu?: number | undefined;
        mainGpu?: number | undefined;
        keepAlive?: string | undefined;
    } | undefined;
}, {
    proxy?: {
        usage?: {
            inputTokens?: number | undefined;
            outputTokens?: number | undefined;
            totalTokens?: number | undefined;
            thinkingTokens?: number | undefined;
        } | undefined;
        version?: string | undefined;
        backend?: string | undefined;
        model?: string | undefined;
        requestId?: string | undefined;
        traceId?: string | undefined;
        startTime?: number | undefined;
        cost?: {
            inputCost?: number | undefined;
            outputCost?: number | undefined;
            totalCost?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        timing?: {
            queuedMs?: number | undefined;
            processingMs?: number | undefined;
            totalMs?: number | undefined;
        } | undefined;
        retryAfterMs?: number | undefined;
    } | undefined;
    anthropic?: {
        model?: string | undefined;
        maxTokens?: number | undefined;
        thinking?: "disabled" | "enabled" | "streaming" | undefined;
        maxThinkingTokens?: number | undefined;
        thinkingBlockId?: string | undefined;
        thinkingBlockIndex?: number | undefined;
        cacheControl?: {
            type: "ephemeral";
            ttl?: number | undefined;
        } | undefined;
        cacheReadInputTokens?: number | undefined;
        cacheCreationInputTokens?: number | undefined;
        stopSequences?: string[] | undefined;
        interleaved_thinking?: boolean | undefined;
        stopReason?: string | undefined;
        stopSequence?: string | null | undefined;
    } | undefined;
    openai?: {
        model?: string | undefined;
        reasoning?: {
            effort: "low" | "medium" | "high";
            summary?: "disabled" | "auto" | "always" | undefined;
        } | undefined;
        reasoningTokens?: number | undefined;
        reasoningSummary?: boolean | undefined;
        builtinTools?: {
            type: "web_search" | "code_interpreter" | "file_search";
            config?: Record<string, unknown> | undefined;
        }[] | undefined;
        builtinTool?: boolean | undefined;
        serverExecuted?: boolean | undefined;
        fileIds?: string[] | undefined;
        vectorStoreIds?: string[] | undefined;
        responseFormat?: {
            type: "text" | "json_object" | "json_schema";
            schema?: Record<string, unknown> | undefined;
        } | undefined;
        prediction?: {
            type: "content";
            content: string;
        } | undefined;
    } | undefined;
    ollama?: {
        model?: string | undefined;
        temperature?: number | undefined;
        topP?: number | undefined;
        topK?: number | undefined;
        repeatPenalty?: number | undefined;
        contextLength?: number | undefined;
        numPredict?: number | undefined;
        numGpu?: number | undefined;
        mainGpu?: number | undefined;
        keepAlive?: string | undefined;
    } | undefined;
}>;
export type ProxyMeta = z.infer<typeof ProxyMetaSchema>;
export type AnthropicMeta = z.infer<typeof AnthropicMetaSchema>;
export type OpenAIMeta = z.infer<typeof OpenAIMetaSchema>;
export type OllamaMeta = z.infer<typeof OllamaMetaSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
/**
 * Validate metadata according to policy
 */
export declare function validateMetadata(metadata: unknown, policy?: MetadataPolicy): Metadata;
/**
 * Merge metadata objects, with right taking precedence
 */
export declare function mergeMetadata(left: Metadata, right: Metadata): Metadata;
/**
 * Extract metadata from nested content blocks
 */
export declare function extractMetadata(content: unknown[]): Metadata;
/**
 * Log unknown metadata keys (for permissive mode)
 */
export declare function logUnknownMetadata(metadata: Record<string, unknown>, logger?: {
    warn: (msg: string, meta?: Record<string, unknown>) => void;
}): void;
//# sourceMappingURL=meta.d.ts.map