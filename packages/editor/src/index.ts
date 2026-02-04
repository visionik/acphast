/**
 * @acphast/editor
 * Visual graph editor for Acphast pipelines
 */

// Editor core
export { createEditor } from './editor.js';
export type { EditorInstance, EditorSetupOptions } from './editor.js';

// Types
export type {
  Schemes,
  AreaExtra,
  PaletteItem,
  EditorState,
  EditorCallbacks,
  EditorConfig,
  Position,
  NodePositions,
} from './types.js';

// Components
export {
  GraphEditor,
  useGraphEditor,
  NodePalette,
  Toolbar,
  EditorApp,
} from './components/index.js';

export type {
  GraphEditorProps,
  NodePaletteProps,
  ToolbarProps,
  EditorAppProps,
} from './components/index.js';
