import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '../src/components/EditorApp';
import { NodeRegistry } from '@acphast/nodes';
import {
  ACPPassthroughNode,
  AnthropicAdapterNode,
  AnthropicTranslatorNode,
  AnthropicClientNode,
  ResponseNormalizerNode,
  OpenAITranslatorNode,
  OpenAIClientNode,
  OpenAINormalizerNode,
  SplitterNode,
  CombinerNode,
  AnalyzedCombinerNode,
  ACPInputNode,
  ACPOutputNode,
} from '@acphast/nodes';
import graphData from '../../../graphs/claude.json';
import type { SerializedGraph } from '@acphast/engine';

const STORAGE_KEY = 'deft-bridge-graph';
const AUTOSAVE_KEY = 'deft-bridge-autosave';

// Create and populate registry
const registry = new NodeRegistry();
registry.register(ACPInputNode as any);
registry.register(ACPOutputNode as any);
registry.register(ACPPassthroughNode as any);
registry.register(AnthropicAdapterNode as any);
registry.register(AnthropicTranslatorNode as any);
registry.register(AnthropicClientNode as any);
registry.register(ResponseNormalizerNode as any);
registry.register(OpenAITranslatorNode as any);
registry.register(OpenAIClientNode as any);
registry.register(OpenAINormalizerNode as any);
registry.register(SplitterNode as any);
registry.register(CombinerNode as any);
registry.register(AnalyzedCombinerNode as any);

function App() {
  // Try to load from localStorage, fallback to default graph
  const loadInitialGraph = (): SerializedGraph => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        console.log('Loaded graph from localStorage');
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load saved graph:', err);
    }
    return graphData as SerializedGraph;
  };

  const handleSave = (graph: SerializedGraph) => {
    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(graph, null, 2));
      
      // Download as JSON file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `deft-bridge-graph-${timestamp}.json`;
      const json = JSON.stringify(graph, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('Graph saved:', filename);
      alert(`Graph saved!\n- Downloaded: ${filename}\n- Saved to browser storage`);
    } catch (err) {
      console.error('Failed to save graph:', err);
      alert('Failed to save graph: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Autosave every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      const autosaveData = localStorage.getItem(AUTOSAVE_KEY);
      if (autosaveData) {
        console.log('Autosave available');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <EditorApp
      registry={registry}
      initialGraph={loadInitialGraph()}
      title="Deft Bridge DAG Editor"
      onSave={handleSave}
    />
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
