import type { CodeEdge } from '../types';

interface PathResult {
  nodeIds: string[];
  edgeIds: string[];
  found: boolean;
}

/**
 * BFS pathfinding between two nodes — like Google Maps route finding.
 * Searches in both directions (source→target and target→source) since
 * import edges are directional but we want to find any connection.
 */
export function findPath(
  fromId: string,
  toId: string,
  edges: CodeEdge[],
): PathResult {
  // Build adjacency list (bidirectional for search)
  const adj = new Map<string, { nodeId: string; edgeId: string }[]>();

  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ nodeId: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ nodeId: edge.source, edgeId: edge.id });
  }

  // BFS
  const visited = new Set<string>([fromId]);
  const queue: { nodeId: string; path: string[]; edgePath: string[] }[] = [
    { nodeId: fromId, path: [fromId], edgePath: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.nodeId === toId) {
      return {
        nodeIds: current.path,
        edgeIds: current.edgePath,
        found: true,
      };
    }

    const neighbors = adj.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        visited.add(neighbor.nodeId);
        queue.push({
          nodeId: neighbor.nodeId,
          path: [...current.path, neighbor.nodeId],
          edgePath: [...current.edgePath, neighbor.edgeId],
        });
      }
    }
  }

  return { nodeIds: [], edgeIds: [], found: false };
}
