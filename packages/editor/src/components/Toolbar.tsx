/**
 * Toolbar Component
 * Top toolbar with editor actions
 */

// React is used via JSX transform
import styled from 'styled-components';

/**
 * Toolbar props
 */
export interface ToolbarProps {
  /** Graph name/title */
  title?: string;
  /** Whether the graph has unsaved changes */
  isDirty?: boolean;
  /** Callback for save action */
  onSave?: () => void;
  /** Callback for load action */
  onLoad?: () => void;
  /** Callback for clear action */
  onClear?: () => void;
  /** Callback for zoom to fit */
  onZoomToFit?: () => void;
  /** Callback for export action */
  onExport?: () => void;
  /** CSS class name */
  className?: string;
}

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background-color: #0f172a;
  border-bottom: 1px solid #2d3a5a;
  font-family: system-ui, -apple-system, sans-serif;
`;

const Title = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #e6f1ff;
  margin-right: 8px;
`;

const DirtyIndicator = styled.span`
  color: #f39c12;
  margin-left: 4px;
`;

const Spacer = styled.div`
  flex: 1;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{ $variant?: 'default' | 'primary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${(props) => {
    switch (props.$variant) {
      case 'primary':
        return `
          background-color: #4a90d9;
          color: #fff;
          &:hover { background-color: #3a7bc8; }
        `;
      case 'danger':
        return `
          background-color: transparent;
          color: #e74c3c;
          border: 1px solid #e74c3c44;
          &:hover { background-color: #e74c3c22; }
        `;
      default:
        return `
          background-color: #1a2744;
          color: #8892b0;
          &:hover { background-color: #243456; color: #e6f1ff; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background-color: #2d3a5a;
  margin: 0 8px;
`;

/**
 * Toolbar component
 */
export function Toolbar({
  title = 'Untitled Graph',
  isDirty = false,
  onSave,
  onLoad,
  onClear,
  onZoomToFit,
  onExport,
  className,
}: ToolbarProps) {
  return (
    <ToolbarContainer className={className}>
      <Title>
        {title}
        {isDirty && <DirtyIndicator>•</DirtyIndicator>}
      </Title>

      <Spacer />

      <ButtonGroup>
        {onZoomToFit && (
          <Button onClick={onZoomToFit} title="Zoom to Fit (Ctrl+0)">
            🔍 Fit
          </Button>
        )}

        <Divider />

        {onLoad && (
          <Button onClick={onLoad} title="Load Graph">
            📂 Load
          </Button>
        )}

        {onSave && (
          <Button onClick={onSave} $variant="primary" title="Save Graph (Ctrl+S)">
            💾 Save
          </Button>
        )}

        {onExport && (
          <Button onClick={onExport} title="Export as JSON">
            📤 Export
          </Button>
        )}

        <Divider />

        {onClear && (
          <Button onClick={onClear} $variant="danger" title="Clear All Nodes">
            🗑️ Clear
          </Button>
        )}
      </ButtonGroup>
    </ToolbarContainer>
  );
}
