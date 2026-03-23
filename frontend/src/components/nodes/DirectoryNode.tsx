import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { DirectoryNodeData } from '../../types';
import { useGraphStore } from '../../store/useGraphStore';

function DirectoryNodeComponent({ data, id }: { data: DirectoryNodeData; id: string }) {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const isSelected = selectedId === id;

  return (
    <div
      className={`ruth-node ruth-node--directory ${isSelected ? 'ruth-node--selected' : ''} ${data.isExpanded ? 'ruth-node--expanded' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="ruth-handle" />

      <div className="ruth-node__header">
        <svg className="ruth-node__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="ruth-node__label">{data.label}/</span>
      </div>

      <div className="ruth-node__meta">
        <span>{data.childCount} items</span>
        <span className="ruth-node__meta-sep">·</span>
        <span>{data.isExpanded ? 'expanded' : 'collapsed'}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="ruth-handle" />
    </div>
  );
}

export const DirectoryNode = memo(DirectoryNodeComponent);
