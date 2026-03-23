import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { CodeEdgeData } from '../../types';

export function CallEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps & { data?: CodeEdgeData }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const weight = data?.weight ?? 1;
  const baseWidth = Math.min(1.8 + (weight - 1) * 0.8, 5);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'var(--accent-purple)' : 'var(--edge-call)',
          strokeWidth: selected ? baseWidth + 1 : baseWidth,
          opacity: selected ? 1 : Math.min(0.5 + weight * 0.15, 0.9),
          transition: 'all 0.2s ease',
        }}
        markerEnd="url(#ruth-arrow)"
      />
      {weight > 1 && (
        <EdgeLabelRenderer>
          <div
            className="ruth-edge-label ruth-edge-label--call"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            ×{weight}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CallEdge = memo(CallEdgeComponent);
