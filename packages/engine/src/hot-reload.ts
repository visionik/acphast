/**
 * Hot-Reload System
 * Watches graph files and reloads them when changed
 */

import { watch, type FSWatcher } from 'fs';
import { readFile } from 'fs/promises';
import type { Logger } from '@acphast/core';
import type { AcphastEngine } from './engine.js';
import { validateGraph } from './graph.js';

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
export class HotReloadManager {
  private watcher?: FSWatcher;
  private debounceTimer?: NodeJS.Timeout;
  private config: Required<HotReloadConfig>;
  private engine: AcphastEngine;
  private logger?: Logger;
  private isReloading = false;

  constructor(
    engine: AcphastEngine,
    config: HotReloadConfig,
    logger?: Logger
  ) {
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
  start(): void {
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
  stop(): void {
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
  async reload(): Promise<boolean> {
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
        } catch (error) {
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
    } catch (error) {
      this.logger?.error('Failed to reload graph', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Check if hot-reload is active
   */
  isActive(): boolean {
    return this.watcher !== undefined;
  }

  // Private methods

  private scheduleReload(): void {
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
