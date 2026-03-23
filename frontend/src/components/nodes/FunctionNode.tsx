import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FunctionNodeData } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { getNodeColorByOverlay } from '../../utils/overlays';
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../../utils/icons';

function FunctionNodeComponent({ data, id }: { data: FunctionNodeData; id: string }) {
  const overlay = useGraphStore((s) => s.activeOverlay);
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const accentColor = getNodeColorByOverlay(overlay, data.annotations);
  const isSelected = selectedId === id;

  return (
    <div
      className={`ruth-node ruth-node--function ${isSelected ? 'ruth-node--selected' : ''}`}
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="ruth-handle" />

      <div className="ruth-node__header">
        <svg className="ruth-node__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4m-12 6H5a2 2 0 01-2-2v-4" />
        </svg>
        <span className="ruth-node__label">
          {data.isAsync && <span className="ruth-node__async-badge">async</span>}
          {data.label}
        </span>
        <span
          className="ruth-node__lang-badge"
          style={{ background: LANGUAGE_COLORS[data.language] }}
        >
          {LANGUAGE_LABELS[data.language]}
        </span>
      </div>

      <div className="ruth-node__meta">
        <span>{data.params.length} params</span>
        {data.returnType && (
          <>
            <span className="ruth-node__meta-sep">·</span>
            <span>→ {data.returnType}</span>
          </>
        )}
        {data.isExported && (
          <>
            <span className="ruth-node__meta-sep">·</span>
            <span className="ruth-node__export-tag">exported</span>
          </>
        )}
      </div>

      {data.annotations.complexity != null && (
        <div className="ruth-node__complexity-bar">
          <div
            className="ruth-node__complexity-fill"
            style={{
              width: `${Math.min(100, data.annotations.complexity)}%`,
              background: accentColor,
            }}
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="ruth-handle" />
    </div>
  );
}

export const FunctionNode = memo(FunctionNodeComponent);
