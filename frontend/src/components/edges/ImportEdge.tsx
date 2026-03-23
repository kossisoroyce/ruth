import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import type { CodeEdgeData } from '../../types';

export function ImportEdgeComponent({
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

  // Traffic lanes: heavier imports = thicker stroke
  const weight = data?.weight ?? 1;
  const baseWidth = Math.min(1.5 + (weight - 1) * 0.8, 5);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'var(--accent-blue)' : 'var(--edge-import)',
          strokeWidth: selected ? baseWidth + 1 : baseWidth,
          strokeDasharray: '6 4',
          opacity: selected ? 1 : Math.min(0.4 + weight * 0.15, 0.9),
          transition: 'all 0.2s ease',
        }}
      />
      {weight > 1 && (
        <EdgeLabelRenderer>
          <div
            className="ruth-edge-label"
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

export const ImportEdge = memo(ImportEdgeComponent);
