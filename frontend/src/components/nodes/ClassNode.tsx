import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ClassNodeData } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { getNodeColorByOverlay } from '../../utils/overlays';
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../../utils/icons';

function ClassNodeComponent({ data, id }: { data: ClassNodeData; id: string }) {
  const overlay = useGraphStore((s) => s.activeOverlay);
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const accentColor = getNodeColorByOverlay(overlay, data.annotations);
  const isSelected = selectedId === id;

  return (
    <div
      className={`ruth-node ruth-node--class ${isSelected ? 'ruth-node--selected' : ''}`}
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="ruth-handle" />

      <div className="ruth-node__header">
        <svg className="ruth-node__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12,2 2,7 12,12 22,7" />
          <polyline points="2,17 12,22 22,17" />
          <polyline points="2,12 12,17 22,12" />
        </svg>
        <span className="ruth-node__label">{data.label}</span>
        <span
          className="ruth-node__lang-badge"
          style={{ background: LANGUAGE_COLORS[data.language] }}
        >
          {LANGUAGE_LABELS[data.language]}
        </span>
      </div>

      <div className="ruth-node__meta">
        <span>{data.methodCount} methods</span>
        {data.parentClass && (
          <>
            <span className="ruth-node__meta-sep">·</span>
            <span>extends {data.parentClass}</span>
          </>
        )}
      </div>

      {data.annotations.vulnerabilities && data.annotations.vulnerabilities.length > 0 && (
        <div className="ruth-node__vuln-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          {data.annotations.vulnerabilities.length}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="ruth-handle" />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
