/**
 * ACP Passthrough Adapter Node
 * Forwards ACP messages to another ACP agent without translation
 */
import { Observable } from 'rxjs';
import { AcphastNode } from '../base/node.js';
import type { PipelineMessage, PipelineContext } from '@acphast/core';
/**
 * Configuration for ACP passthrough adapter
 */
export interface ACPPassthroughConfig extends Record<string, unknown> {
    /** Endpoint URL or command for the target ACP agent */
    endpoint: string;
    /** Connection type */
    type: 'stdio' | 'http' | 'websocket';
    /** Timeout in milliseconds */
    timeout?: number;
}
/**
 * ACP Passthrough Adapter Node
 *
 * This is the simplest adapter - it forwards messages to another
 * ACP agent without any translation. Useful for:
 * - Testing the pipeline
 * - Chaining multiple Acphast instances
 * - Proxying to ACP-native backends
 */
export declare class ACPPassthroughNode extends AcphastNode {
    static meta: {
        name: string;
        category: "adapter";
        description: string;
        inputs: {
            name: string;
            type: "pipeline";
            label: string;
            required: boolean;
        }[];
        outputs: {
            name: string;
            type: "pipeline";
            label: string;
        }[];
    };
    constructor(config: ACPPassthroughConfig);
    process(inputs: Record<string, Observable<PipelineMessage>[]>, _ctx: PipelineContext): Record<string, Observable<PipelineMessage>>;
    /**
     * Validate configuration
     */
    validate(): string[];
    /**
     * Lifecycle: Initialize connection when node is added
     */
    onAdded(): void;
    /**
     * Lifecycle: Close connection when node is removed
     */
    onRemoved(): void;
}
//# sourceMappingURL=acp-passthrough.d.ts.map