/**
 * NodePalette Component
 * Sidebar showing available nodes grouped by category
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import type { NodeMetadata } from '@acphast/nodes';

/**
 * NodePalette props
 */
export interface NodePaletteProps {
  /** Map of node type names to metadata */
  nodeTypes: Map<string, NodeMetadata>;
  /** Callback when a node type is selected (for drag-and-drop) */
  onNodeSelect?: (type: string, meta: NodeMetadata) => void;
  /** Callback when node drag starts */
  onDragStart?: (type: string, meta: NodeMetadata, event: React.DragEvent) => void;
  /** Callback when node drag ends (drop or cancel) */
  onDragEnd?: (type: string, meta: NodeMetadata, event: React.DragEvent) => void;
  /** CSS class name */
  className?: string;
}

const PaletteContainer = styled.div`
  width: 260px;
  height: 100%;
  background-color: #16213e;
  border-right: 1px solid #2d3a5a;
  overflow-y: auto;
  font-family: system-ui, -apple-system, sans-serif;
`;

const PaletteHeader = styled.div`
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #8892b0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2d3a5a;
`;

const CategorySection = styled.div`
  margin-bottom: 8px;
`;

const CategoryHeader = styled.div`
  padding: 12px 16px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #5a6a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const NodeItem = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin: 4px 8px;
  background-color: #1a2744;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.15s ease;
  border-left: 3px solid ${(props) => props.$color || '#4a90d9'};

  &:hover {
    background-color: #243456;
    transform: translateX(2px);
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.98);
  }
`;

const NodeIcon = styled.div<{ $color?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: ${(props) => props.$color || '#4a90d9'}22;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 14px;
`;

const NodeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const NodeName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #e6f1ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NodeDescription = styled.div`
  font-size: 11px;
  color: #8892b0;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * Get color for node category
 */
function getCategoryColor(category: NodeMetadata['category']): string {
  const colors: Record<NodeMetadata['category'], string> = {
    adapter: '#4a90d9',    // Blue
    routing: '#9b59b6',    // Purple
    transform: '#27ae60',  // Green
    input: '#f39c12',      // Orange
    output: '#e74c3c',     // Red
    utility: '#95a5a6',    // Gray
  };
  return colors[category] || '#4a90d9';
}

/**
 * Get icon for node category
 */
function getCategoryIcon(category: NodeMetadata['category']): string {
  const icons: Record<NodeMetadata['category'], string> = {
    adapter: '🔌',
    routing: '🔀',
    transform: '⚙️',
    input: '📥',
    output: '📤',
    utility: '🔧',
  };
  return icons[category] || '📦';
}

/**
 * NodePalette component
 */
export function NodePalette({
  nodeTypes,
  onNodeSelect,
  onDragStart,
  onDragEnd,
  className,
}: NodePaletteProps) {
  // Group nodes by category
  const groupedNodes = useMemo(() => {
    const groups = new Map<NodeMetadata['category'], Array<{ type: string; meta: NodeMetadata }>>();

    for (const [type, meta] of nodeTypes.entries()) {
      const category = meta.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push({ type, meta });
    }

    // Sort categories
    const categoryOrder: NodeMetadata['category'][] = [
      'input',
      'adapter',
      'routing',
      'transform',
      'output',
      'utility',
    ];

    return categoryOrder
      .filter((cat) => groups.has(cat))
      .map((cat) => ({
        category: cat,
        nodes: groups.get(cat)!.sort((a, b) => a.meta.name.localeCompare(b.meta.name)),
      }));
  }, [nodeTypes]);

  const handleDragStart = (
    type: string,
    meta: NodeMetadata,
    event: React.DragEvent
  ) => {
    // Set drag data
    event.dataTransfer.setData('application/acphast-node', JSON.stringify({ type, meta }));
    event.dataTransfer.effectAllowed = 'copy';

    onDragStart?.(type, meta, event);
  };

  const handleDragEnd = (
    type: string,
    meta: NodeMetadata,
    event: React.DragEvent
  ) => {
    onDragEnd?.(type, meta, event);
  };

  return (
    <PaletteContainer className={className}>
      <PaletteHeader>Nodes</PaletteHeader>

      {groupedNodes.map(({ category, nodes }) => (
        <CategorySection key={category}>
          <CategoryHeader>{category}</CategoryHeader>
          {nodes.map(({ type, meta }) => {
            const color = getCategoryColor(meta.category);
            const icon = getCategoryIcon(meta.category);

            return (
              <NodeItem
                key={type}
                $color={color}
                draggable
                onDragStart={(e) => handleDragStart(type, meta, e)}
                onDragEnd={(e) => handleDragEnd(type, meta, e)}
                onClick={() => onNodeSelect?.(type, meta)}
              >
                <NodeIcon $color={color}>{icon}</NodeIcon>
                <NodeInfo>
                  <NodeName>{meta.name}</NodeName>
                  {meta.description && (
                    <NodeDescription>{meta.description}</NodeDescription>
                  )}
                </NodeInfo>
              </NodeItem>
            );
          })}
        </CategorySection>
      ))}

      {groupedNodes.length === 0 && (
        <div style={{ padding: '20px', color: '#8892b0', textAlign: 'center' }}>
          No nodes available
        </div>
      )}
    </PaletteContainer>
  );
}
