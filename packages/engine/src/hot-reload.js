/**
 * Hot-Reload System
 * Watches graph files and reloads them when changed
 */
import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { validateGraph } from './graph.js';
/**
 * Hot-Reload Manager
 *
 * Watches graph files and automatically reloads them when changed
 * Validates graphs before applying to prevent breaking the engine
 */
export class HotReloadManager {
    watcher;
    debounceTimer;
    config;
    engine;
    logger;
    isReloading = false;
    constructor(engine, config, logger) {
        this.engine = engine;
        this.logger = logger;
        this.config = {
            graphPath: config.graphPath,
            debounceMs: config.debounceMs ?? 500,
            validate: config.validate ?? true,
        };
    }
    /**
     * Start watching the graph file
     */
    start() {
        if (this.watcher) {
            this.logger?.warn('Hot-reload already started');
            return;
        }
        this.logger?.info('Starting hot-reload', {
            graphPath: this.config.graphPath,
        });
        this.watcher = watch(this.config.graphPath, (eventType) => {
            if (eventType === 'change') {
                this.scheduleReload();
            }
        });
        // Handle watcher errors
        this.watcher.on('error', (error) => {
            this.logger?.error('File watcher error', { error: error.message });
        });
    }
    /**
     * Stop watching
     */
    stop() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
            this.logger?.info('Hot-reload stopped');
        }
    }
    /**
     * Manually trigger a reload
     */
    async reload() {
        if (this.isReloading) {
            this.logger?.debug('Reload already in progress, skipping');
            return false;
        }
        this.isReloading = true;
        try {
            this.logger?.debug('Reloading graph', {
                path: this.config.graphPath,
            });
            // Read file
            const content = await readFile(this.config.graphPath, 'utf-8');
            const graph = JSON.parse(content);
            // Validate if enabled
            if (this.config.validate) {
                try {
                    validateGraph(graph);
                }
                catch (error) {
                    this.logger?.error('Graph validation failed', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return false;
                }
            }
            // Load into engine
            await this.engine.loadGraph(graph);
            this.logger?.info('Graph reloaded successfully');
            return true;
        }
        catch (error) {
            this.logger?.error('Failed to reload graph', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
        finally {
            this.isReloading = false;
        }
    }
    /**
     * Check if hot-reload is active
     */
    isActive() {
        return this.watcher !== undefined;
    }
    // Private methods
    scheduleReload() {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        // Schedule new reload
        this.debounceTimer = setTimeout(() => {
            void this.reload();
        }, this.config.debounceMs);
    }
}
//# sourceMappingURL=hot-reload.js.map