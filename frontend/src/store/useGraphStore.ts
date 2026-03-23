import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { CodeNode, CodeEdge, OverlayMode, LayoutDirection } from '../types';
import { applyDagreLayout } from '../utils/layout';
import { findPath } from '../utils/pathfinding';

interface GraphState {
  // ── Data ──
  nodes: CodeNode[];
  edges: CodeEdge[];
  projectName: string;
  languages: string[];

  // ── UI state ──
  selectedNodeId: string | null;
  activeOverlay: OverlayMode;
  searchQuery: string;
  layoutDirection: LayoutDirection;
  connected: boolean;

  // ── Path tracing (directions) ──
  traceMode: boolean;
  traceFrom: string | null;
  traceTo: string | null;
  tracePath: string[]; // node IDs in the path
  traceEdges: string[]; // edge IDs in the path

  // ── React Flow handlers ──
  onNodesChange: (changes: NodeChange<CodeNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CodeEdge>[]) => void;

  // ── Actions ──
  setFullGraph: (nodes: CodeNode[], edges: CodeEdge[], projectName: string, languages: string[]) => void;
  addNode: (node: CodeNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, data: Partial<CodeNode['data']>) => void;
  addEdge: (edge: CodeEdge) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  setOverlay: (overlay: OverlayMode) => void;
  setSearch: (query: string) => void;
  setLayoutDirection: (d: LayoutDirection) => void;
  setConnected: (c: boolean) => void;
  applyLayout: () => void;
  toggleTraceMode: () => void;
  setTraceNode: (id: string) => void;
  clearTrace: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  // ── Initial data ──
  nodes: [],
  edges: [],
  projectName: 'ruth',
  languages: [],

  // ── Initial UI ──
  selectedNodeId: null,
  activeOverlay: 'none',
  searchQuery: '',
  layoutDirection: 'TB',
  connected: false,

  // ── Path tracing ──
  traceMode: false,
  traceFrom: null,
  traceTo: null,
  tracePath: [],
  traceEdges: [],

  // ── React Flow change handlers ──
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as CodeNode[] });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as CodeEdge[] });
  },

  // ── Graph mutations ──
  setFullGraph: (nodes, edges, projectName, languages) => {
    const positioned = applyDagreLayout(nodes, edges, get().layoutDirection);
    set({ nodes: positioned as CodeNode[], edges, projectName, languages });
  },

  addNode: (node) => {
    set((s) => {
      const newNodes = [...s.nodes, node];
      const positioned = applyDagreLayout(newNodes, s.edges, s.layoutDirection);
      return { nodes: positioned as CodeNode[] };
    });
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
  },

  updateNode: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ) as CodeNode[],
    }));
  },

  addEdge: (edge) => {
    set((s) => ({ edges: [...s.edges, edge] }));
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
  },

  // ── UI actions ──
  selectNode: (id) => set({ selectedNodeId: id }),
  setOverlay: (overlay) => set({ activeOverlay: overlay }),
  setSearch: (query) => set({ searchQuery: query }),
  setLayoutDirection: (d) => set({ layoutDirection: d }),
  setConnected: (c) => set({ connected: c }),

  applyLayout: () => {
    set((s) => {
      const positioned = applyDagreLayout(s.nodes, s.edges, s.layoutDirection);
      return { nodes: positioned as CodeNode[] };
    });
  },

  // ── Path tracing (Google Maps directions) ──
  toggleTraceMode: () => {
    set((s) => ({
      traceMode: !s.traceMode,
      traceFrom: null,
      traceTo: null,
      tracePath: [],
      traceEdges: [],
    }));
  },

  setTraceNode: (id) => {
    const s = get();
    if (!s.traceFrom) {
      // First click: set origin
      set({ traceFrom: id, traceTo: null, tracePath: [], traceEdges: [] });
    } else if (s.traceFrom === id) {
      // Clicked same node: deselect
      set({ traceFrom: null });
    } else {
      // Second click: find path
      const result = findPath(s.traceFrom, id, s.edges);
      set({
        traceTo: id,
        tracePath: result.nodeIds,
        traceEdges: result.edgeIds,
      });
    }
  },

  clearTrace: () => {
    set({
      traceMode: false,
      traceFrom: null,
      traceTo: null,
      tracePath: [],
      traceEdges: [],
    });
  },

}));
