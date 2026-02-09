/**
 * GraphEditor Component
 * Main React component for the visual graph editor
 */

import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';

import type { NodeRegistry } from '@acphast/nodes';
import type { SerializedGraph } from '@acphast/engine';
import { createEditor, type EditorInstance } from '../editor.js';

/**
 * GraphEditor props
 */
export interface GraphEditorProps {
  /** Node registry with available node types */
  registry: NodeRegistry;
  /** Initial graph to load */
  initialGraph?: SerializedGraph;
  /** Callback when graph changes */
  onChange?: (graph: SerializedGraph) => void;
  /** Callback when save is requested (Ctrl+S) */
  onSave?: (graph: SerializedGraph) => void;
  /** Whether editor is read-only */
  readOnly?: boolean;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const EditorContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #1a1a2e;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: hidden;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(26, 26, 46, 0.8);
  color: #fff;
  font-family: system-ui, sans-serif;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 12px 16px;
  background-color: rgba(220, 53, 69, 0.9);
  color: #fff;
  border-radius: 4px;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  max-width: 300px;
`;

/**
 * GraphEditor component
 * Provides a visual node-based editor for Acphast graphs
 */
export function GraphEditor({
  registry,
  initialGraph,
  onChange,
  onSave,
  readOnly = false,
  className,
  style,
}: GraphEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const editor = await createEditor({
          container: containerRef.current!,
          registry,
          onChange,
          readOnly,
        });

        if (destroyed) {
          editor.destroy();
          return;
        }

        editorRef.current = editor;

        // Load initial graph if provided
        if (initialGraph) {
          await editor.importGraph(initialGraph);
          await editor.zoomToFit();
        }

        setIsLoading(false);
      } catch (err) {
        if (!destroyed) {
          setError(err instanceof Error ? err.message : 'Failed to initialize editor');
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [registry, readOnly]); // Note: onChange excluded to prevent re-init on callback change

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave && editorRef.current) {
          onSave(editorRef.current.exportGraph());
        }
      }
      // Delete key to remove selected (not implemented yet)
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <EditorContainer ref={containerRef} className={className} style={style}>
      {isLoading && <LoadingOverlay>Initializing editor...</LoadingOverlay>}
      {error && <ErrorOverlay>{error}</ErrorOverlay>}
    </EditorContainer>
  );
}

/**
 * Hook to access editor instance from parent component
 */
export function useGraphEditor(
  ref: React.RefObject<HTMLDivElement>,
  registry: NodeRegistry,
  options?: {
    initialGraph?: SerializedGraph;
    onChange?: (graph: SerializedGraph) => void;
    readOnly?: boolean;
  }
) {
  const [editor, setEditor] = useState<EditorInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const containerEl: HTMLElement = container;

    // In React StrictMode (dev) and HMR, effects can run multiple times.
    // Track/destroy any previous editor instance attached to this container.
    const key = '__acphastEditorInstance__';
    const prev = (containerEl as unknown as Record<string, unknown>)[key];
    if (prev && typeof prev === 'object' && 'destroy' in (prev as Record<string, unknown>)) {
      try {
        (prev as { destroy: () => void }).destroy();
      } catch {
        // ignore
      }
    }

    // Ensure container is clean before mounting a new editor
    containerEl.innerHTML = '';

    let destroyed = false;
    let instance: EditorInstance | null = null;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        instance = await createEditor({
          container: containerEl,
          registry,
          onChange: options?.onChange,
          readOnly: options?.readOnly,
        });

        // Attach for future cleanup (StrictMode/HMR)
        (containerEl as unknown as Record<string, unknown>)[key] = instance;

        if (destroyed) {
          instance.destroy();
          return;
        }

        // Load initial graph if provided
        if (options?.initialGraph) {
          await instance.importGraph(options.initialGraph);
          await instance.zoomToFit();
        }

        setEditor(instance);
        setIsLoading(false);
      } catch (err) {
        if (!destroyed) {
          setError(err instanceof Error ? err : new Error('Failed to initialize'));
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;

      if (instance) {
        try {
          instance.destroy();
        } finally {
          const current = (containerEl as unknown as Record<string, unknown>)[key];
          if (current === instance) {
            delete (containerEl as unknown as Record<string, unknown>)[key];
          }
        }
      }
    };
  }, [registry, options?.readOnly]);

  return { editor, isLoading, error };
}
