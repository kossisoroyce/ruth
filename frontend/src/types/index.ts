import type { Node, Edge } from '@xyflow/react';

// ── Node annotation data ──────────────────────────────────────────────

export interface VulnerabilityInfo {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  source: string; // e.g. "semgrep", "osv"
}

export interface AnnotationData {
  complexity?: number;         // cyclomatic complexity (0-100 scale)
  vulnerabilities?: VulnerabilityInfo[];
  coverage?: number;           // 0-100 percentage
  duplicateLines?: number;
}

// ── Landmark roles (Google Maps POIs for code) ────────────────────────

export type NodeRole = 'entrypoint' | 'orchestrator' | 'hub' | 'config' | 'island';

// ── Node types ────────────────────────────────────────────────────────

export type NodeKind = 'module' | 'class' | 'function' | 'directory';
export type Language = 'python' | 'typescript' | 'javascript' | 'rust' | 'go' | 'java' | 'ruby' | 'c' | 'cpp' | 'unknown';

export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  language: Language;
  filePath: string;
  annotations: AnnotationData;
  roles?: NodeRole[];
  inDegree?: number;
  outDegree?: number;
}

export interface ModuleNodeData extends BaseNodeData {
  kind: 'module';
  exportCount: number;
  importCount: number;
  lineCount: number;
}

export interface ClassNodeData extends BaseNodeData {
  kind: 'class';
  methodCount: number;
  propertyCount: number;
  parentClass?: string;
}

export interface FunctionNodeData extends BaseNodeData {
  kind: 'function';
  params: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface DirectoryNodeData extends BaseNodeData {
  kind: 'directory';
  childCount: number;
  isExpanded: boolean;
}

export type CodeNodeData = ModuleNodeData | ClassNodeData | FunctionNodeData | DirectoryNodeData;
export type CodeNode = Node<CodeNodeData>;

// ── Edge types ────────────────────────────────────────────────────────

export type EdgeKind = 'import' | 'call' | 'extends';

export interface CodeEdgeData extends Record<string, unknown> {
  edgeKind: EdgeKind;
  weight?: number; // how many times this relationship occurs
}

export type CodeEdge = Edge<CodeEdgeData>;

// ── Overlay / UI types ────────────────────────────────────────────────

export type OverlayMode = 'none' | 'complexity' | 'vulnerabilities' | 'coverage';
export type LayoutDirection = 'TB' | 'LR';

// ── WebSocket messages ────────────────────────────────────────────────

export interface WsMessage {
  type: 'full_graph' | 'node_added' | 'node_removed' | 'node_updated'
      | 'edge_added' | 'edge_removed' | 'annotation_updated' | 'error';
  payload: unknown;
}

export interface FullGraphPayload {
  nodes: CodeNode[];
  edges: CodeEdge[];
  projectName: string;
  languages: Language[];
}
