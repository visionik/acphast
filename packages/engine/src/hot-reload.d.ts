/**
 * Hot-Reload System
 * Watches graph files and reloads them when changed
 */
import type { Logger } from '@acphast/core';
import type { AcphastEngine } from './engine.js';
/**
 * Hot-reload configuration
 */
export interface HotReloadConfig {
    /** Path to graph file to watch */
    graphPath: string;
    /** Debounce delay in milliseconds */
    debounceMs?: number;
    /** Validate before reloading */
    validate?: boolean;
}
/**
 * Hot-Reload Manager
 *
 * Watches graph files and automatically reloads them when changed
 * Validates graphs before applying to prevent breaking the engine
 */
export declare class HotReloadManager {
    private watcher?;
    private debounceTimer?;
    private config;
    private engine;
    private logger?;
    private isReloading;
    constructor(engine: AcphastEngine, config: HotReloadConfig, logger?: Logger);
    /**
     * Start watching the graph file
     */
    start(): void;
    /**
     * Stop watching
     */
    stop(): void;
    /**
     * Manually trigger a reload
     */
    reload(): Promise<boolean>;
    /**
     * Check if hot-reload is active
     */
    isActive(): boolean;
    private scheduleReload;
}
//# sourceMappingURL=hot-reload.d.ts.map