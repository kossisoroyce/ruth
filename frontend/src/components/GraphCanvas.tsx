import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { NodeTypes, EdgeTypes } from '@xyflow/react';
import { useGraphStore } from '../store/useGraphStore';
import { ModuleNode } from './nodes/ModuleNode';
import { ClassNode } from './nodes/ClassNode';
import { FunctionNode } from './nodes/FunctionNode';
import { DirectoryNode } from './nodes/DirectoryNode';
import { ImportEdge } from './edges/ImportEdge';
import { CallEdge } from './edges/CallEdge';

const nodeTypes: NodeTypes = {
  module: ModuleNode,
  class: ClassNode,
  function: FunctionNode,
  directory: DirectoryNode,
};

const edgeTypes: EdgeTypes = {
  import: ImportEdge,
  call: CallEdge,
  extends: ImportEdge,
};

export function GraphCanvas() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const selectNode = useGraphStore((s) => s.selectNode);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const connected = useGraphStore((s) => s.connected);
  const traceMode = useGraphStore((s) => s.traceMode);
  const tracePath = useGraphStore((s) => s.tracePath);
  const traceEdges = useGraphStore((s) => s.traceEdges);
  const setTraceNode = useGraphStore((s) => s.setTraceNode);
  const { setCenter } = useReactFlow();

  // Apply search filter and trace mode dimming
  const visibleNodes = useMemo(() => {
    return nodes.map((n) => {
      let opacity = 1;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = n.data.label.toLowerCase().includes(q) || n.data.filePath.toLowerCase().includes(q);
        if (!matches) opacity = 0.15;
      }

      // Trace mode: dim nodes not in path
      if (traceMode && tracePath.length > 0 && !tracePath.includes(n.id)) {
        opacity = 0.1;
      }

      return opacity < 1 ? { ...n, style: { ...n.style, opacity } } : n;
    });
  }, [nodes, searchQuery, traceMode, tracePath]);

  // Highlight traced edges
  const visibleEdges = useMemo(() => {
    if (!traceMode || traceEdges.length === 0) return edges;
    return edges.map((e) => {
      if (traceEdges.includes(e.id)) {
        return { ...e, selected: true };
      }
      return { ...e, style: { ...e.style, opacity: 0.08 } };
    });
  }, [edges, traceMode, traceEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
      if (traceMode) {
        setTraceNode(node.id);
      } else {
        selectNode(node.id);
        setCenter(node.position.x + 110, node.position.y + 40, { duration: 400, zoom: 1.2 });
      }
    },
    [selectNode, setCenter, traceMode, setTraceNode],
  );

  const handlePaneClick = useCallback(() => {
    if (!traceMode) {
      selectNode(null);
    }
  }, [selectNode, traceMode]);

  return (
    <div className="ruth-canvas">
      {/* Trace mode banner */}
      {traceMode && (
        <div className="ruth-trace-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 12H8M12 16V8" />
          </svg>
          <span>
            {tracePath.length > 0
              ? `Route found: ${tracePath.length} nodes`
              : 'Click two nodes to trace the dependency path'
            }
          </span>
        </div>
      )}

      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2.5}
        defaultEdgeOptions={{
          animated: false,
          style: { strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Custom marker definition for call edges */}
        <svg style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <marker
              id="ruth-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-call)" />
            </marker>
          </defs>
        </svg>

        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color="var(--bg-dots)"
        />
        <Controls
          className="ruth-controls"
          showInteractive={false}
        />
        <MiniMap
          className="ruth-minimap"
          nodeColor={(node) => {
            switch (node.type) {
              case 'module': return 'var(--accent-blue)';
              case 'class': return 'var(--accent-purple)';
              case 'function': return 'var(--accent-green)';
              case 'directory': return 'var(--accent-amber)';
              default: return 'var(--text-muted)';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="ruth-canvas__empty">
          <div className="ruth-canvas__empty-content">
            <img src="/logo.svg" alt="Ruth" className="ruth-canvas__empty-logo" />
            <h2 className="ruth-canvas__empty-title">Ruth</h2>
            <p className="ruth-canvas__empty-subtitle">
              {connected ? 'Waiting for graph data...' : 'See your codebase as a living map'}
            </p>
            {!connected && (
              <>
                <code className="ruth-canvas__empty-code">
                  ruth serve ./your-project
                </code>
                <p className="ruth-canvas__empty-hint">
                  Point Ruth at any codebase to explore its topology
                </p>
              </>
            )}
            {connected && (
              <div className="ruth-canvas__empty-loading">
                <div className="ruth-canvas__empty-spinner" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
