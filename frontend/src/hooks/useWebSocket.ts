import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { WsMessage, FullGraphPayload, CodeNode, CodeEdge } from '../types';

// Derive WebSocket URL from current page — works on any port
const DEFAULT_WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

export function useWebSocket(url: string = DEFAULT_WS_URL) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const {
    setFullGraph,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    setConnected,
  } = useGraphStore();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'full_graph': {
            const p = msg.payload as FullGraphPayload;
            setFullGraph(p.nodes, p.edges, p.projectName, p.languages);
            break;
          }
          case 'node_added':
            addNode(msg.payload as CodeNode);
            break;
          case 'node_removed':
            removeNode((msg.payload as { id: string }).id);
            break;
          case 'node_updated': {
            const upd = msg.payload as { id: string; data: Partial<CodeNode['data']> };
            updateNode(upd.id, upd.data);
            break;
          }
          case 'edge_added':
            addEdge(msg.payload as CodeEdge);
            break;
          case 'edge_removed':
            removeEdge((msg.payload as { id: string }).id);
            break;
          case 'annotation_updated': {
            const ann = msg.payload as { id: string; annotations: CodeNode['data']['annotations'] };
            updateNode(ann.id, { annotations: ann.annotations });
            break;
          }
          case 'error':
            console.error('[Ruth WS] Server error:', msg.payload);
            break;
        }
      } catch (err) {
        console.error('[Ruth WS] Failed to parse message:', err);
      }
    },
    [setFullGraph, addNode, removeNode, updateNode, addEdge, removeEdge],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Ruth WS] Connected');
        setConnected(true);
        reconnectAttempt.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setConnected(false);
        // Schedule reconnect with exponential backoff
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
          RECONNECT_MAX_MS,
        );
        reconnectAttempt.current += 1;
        console.log(`[Ruth WS] Disconnected. Reconnecting in ${delay}ms...`);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.warn('[Ruth WS] Connection error:', err);
        ws.close();
      };
    } catch (err) {
      console.warn('[Ruth WS] Failed to connect:', err);
    }
  }, [url, handleMessage, setConnected]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connected: useGraphStore((s) => s.connected),
  };
}
