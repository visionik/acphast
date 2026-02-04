/**
 * EditorApp Component
 * Full editor layout combining all components
 */

import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';

import type { NodeRegistry } from '@acphast/nodes';
import type { SerializedGraph } from '@acphast/engine';
import { useGraphEditor } from './GraphEditor.js';
import { NodePalette } from './NodePalette.js';
import { Toolbar } from './Toolbar.js';

/**
 * EditorApp props
 */
export interface EditorAppProps {
  /** Node registry with available node types */
  registry: NodeRegistry;
  /** Initial graph to load */
  initialGraph?: SerializedGraph;
  /** Graph title */
  title?: string;
  /** Callback when graph is saved */
  onSave?: (graph: SerializedGraph) => void;
  /** Callback when graph is loaded */
  onLoad?: () => Promise<SerializedGraph | null>;
  /** Whether editor is read-only */
  readOnly?: boolean;
}

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #0f172a;
`;

const MainArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const CanvasWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const DropZone = styled.div<{ $isActive: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: ${(props) => (props.$isActive ? 'auto' : 'none')};
  background-color: ${(props) => (props.$isActive ? 'rgba(74, 144, 217, 0.1)' : 'transparent')};
  border: ${(props) => (props.$isActive ? '2px dashed #4a90d9' : 'none')};
  transition: all 0.2s ease;
`;

/**
 * EditorApp component - complete editor with all UI elements
 */
export function EditorApp({
  registry,
  initialGraph: _initialGraph, // TODO: Use for initial load
  title = 'Untitled Graph',
  onSave,
  onLoad,
  readOnly = false,
}: EditorAppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Get node types from registry
  const nodeTypes = registry.getAllMetadata();

  // Use the graph editor hook
  const { editor } = useGraphEditor(containerRef, registry, {
    onChange: useCallback(() => {
      setIsDirty(true);
    }, []),
    readOnly,
  });

  // Handle save
  const handleSave = useCallback(() => {
    if (editor && onSave) {
      const currentGraph = editor.exportGraph();
      onSave(currentGraph);
      setIsDirty(false);
    }
  }, [editor, onSave]);

  // Handle load
  const handleLoad = useCallback(async () => {
    if (editor && onLoad) {
      const loadedGraph = await onLoad();
      if (loadedGraph) {
        await editor.importGraph(loadedGraph);
        await editor.zoomToFit();
        setIsDirty(false);
      }
    }
  }, [editor, onLoad]);

  // Handle clear
  const handleClear = useCallback(async () => {
    if (editor) {
      if (confirm('Are you sure you want to clear all nodes?')) {
        await editor.clear();
        setIsDirty(true);
      }
    }
  }, [editor]);

  // Handle zoom to fit
  const handleZoomToFit = useCallback(async () => {
    if (editor) {
      await editor.zoomToFit();
    }
  }, [editor]);

  // Handle export
  const handleExport = useCallback(() => {
    if (editor) {
      const exportedGraph = editor.exportGraph();
      const json = JSON.stringify(exportedGraph, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [editor, title]);

  // Handle node drop from palette
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/acphast-node')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!editor || !containerRef.current) return;

      const data = e.dataTransfer.getData('application/acphast-node');
      if (!data) return;

      try {
        const { type } = JSON.parse(data);

        // Calculate drop position relative to canvas
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Add node at drop position
        await editor.addNode(type, { x, y });
      } catch (err) {
        console.error('Failed to add node:', err);
      }
    },
    [editor]
  );

  // Handle node selection from palette (add at center)
  const handleNodeSelect = useCallback(
    async (type: string) => {
      if (!editor || !containerRef.current) return;

      // Add node at center of canvas
      const rect = containerRef.current.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;

      await editor.addNode(type, { x, y });
    },
    [editor]
  );

  return (
    <AppContainer>
      <Toolbar
        title={title}
        isDirty={isDirty}
        onSave={onSave ? handleSave : undefined}
        onLoad={onLoad ? handleLoad : undefined}
        onClear={!readOnly ? handleClear : undefined}
        onZoomToFit={handleZoomToFit}
        onExport={handleExport}
      />

      <MainArea>
        {!readOnly && (
          <NodePalette
            nodeTypes={nodeTypes}
            onNodeSelect={handleNodeSelect}
          />
        )}

        <CanvasWrapper>
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
          <DropZone $isActive={isDragOver} />
        </CanvasWrapper>
      </MainArea>
    </AppContainer>
  );
}
