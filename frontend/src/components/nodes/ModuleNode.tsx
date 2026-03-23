import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ModuleNodeData } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';
import { getNodeColorByOverlay } from '../../utils/overlays';
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../../utils/icons';
import { ROLE_CONFIG } from '../../utils/landmarks';

function ModuleNodeComponent({ data, id }: { data: ModuleNodeData; id: string }) {
  const overlay = useGraphStore((s) => s.activeOverlay);
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const accentColor = getNodeColorByOverlay(overlay, data.annotations);
  const isSelected = selectedId === id;
  const primaryRole = data.roles?.[0];
  const roleInfo = primaryRole ? ROLE_CONFIG[primaryRole] : null;

  return (
    <div
      className={`ruth-node ruth-node--module ${isSelected ? 'ruth-node--selected' : ''} ${primaryRole ? `ruth-node--${primaryRole}` : ''}`}
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="ruth-handle" />

      {/* Landmark pin */}
      {roleInfo && (
        <div className="ruth-node__landmark-pin" style={{ background: roleInfo.color }} title={roleInfo.label}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={roleInfo.icon} />
          </svg>
        </div>
      )}

      <div className="ruth-node__header">
        <svg className="ruth-node__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="7" y1="9" x2="17" y2="9" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="7" y1="15" x2="13" y2="15" />
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
        <span>{data.lineCount} lines</span>
        <span className="ruth-node__meta-sep">·</span>
        <span>{data.exportCount} exports</span>
        {roleInfo && (
          <>
            <span className="ruth-node__meta-sep">·</span>
            <span className="ruth-node__role-tag" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
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

export const ModuleNode = memo(ModuleNodeComponent);
