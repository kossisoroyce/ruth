"""Ruth FastAPI server — serves the React frontend and WebSocket API."""

from __future__ import annotations

import json
import asyncio
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse


# Path to the built frontend assets
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts graph updates."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: dict[str, Any]):
        await websocket.send_json(message)

    async def broadcast(self, message: dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


def _build_graph(project_root: Path) -> dict[str, Any]:
    """Build the full code graph by running the parser → graph → annotation pipeline."""
    from ruth.parser.discovery import discover_files
    from ruth.graph.engine import build_graph
    from ruth.annotations.coverage import load_coverage

    # Phase 1: Discover files
    discovery = discover_files(project_root)

    # Phase 2: Build graph from discovered files
    graph = build_graph(discovery, project_root, granularity="module")

    # Phase 3: Overlay coverage data if available
    coverage_data = load_coverage(project_root)
    if coverage_data:
        for node in graph["nodes"]:
            rel_path = node["data"]["filePath"]
            if rel_path in coverage_data:
                node["data"]["annotations"]["coverage"] = coverage_data[rel_path]

    return graph


def create_app(project_path: str = ".") -> FastAPI:
    """Create the FastAPI application with WebSocket and static file serving."""

    app = FastAPI(
        title="Ruth",
        description="Interactive Codebase Topology Visualizer",
        version="0.1.0",
    )

    project_root = Path(project_path).resolve()

    # Cache the graph to avoid re-parsing on every request
    _graph_cache: dict[str, Any] = {}

    def get_graph(force_refresh: bool = False) -> dict[str, Any]:
        if force_refresh or not _graph_cache:
            result = _build_graph(project_root)
            _graph_cache.clear()
            _graph_cache.update(result)
        return _graph_cache

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            # Send initial full graph on connection
            graph = get_graph(force_refresh=True)
            await manager.send_message(websocket, {
                "type": "full_graph",
                "payload": graph,
            })

            # Keep connection alive and listen for client messages
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "refresh":
                    graph = get_graph(force_refresh=True)
                    await manager.send_message(websocket, {
                        "type": "full_graph",
                        "payload": graph,
                    })

        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception as e:
            try:
                await manager.send_message(websocket, {
                    "type": "error",
                    "payload": {"message": str(e)},
                })
            except Exception:
                pass
            manager.disconnect(websocket)

    @app.get("/api/health")
    async def health():
        return {
            "status": "ok",
            "project": project_root.name,
            "connections": len(manager.active_connections),
        }

    @app.get("/api/graph")
    async def get_graph_api():
        return get_graph()

    # Serve the built React frontend
    if FRONTEND_DIR.exists():
        # Serve static assets (JS, CSS, etc.)
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """Serve the SPA — all non-API routes return index.html."""
            file_path = FRONTEND_DIR / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(FRONTEND_DIR / "index.html")
    else:
        @app.get("/")
        async def no_frontend():
            return HTMLResponse(
                "<html><body style='background:#07070d;color:#e8e8f0;font-family:sans-serif;"
                "display:flex;align-items:center;justify-content:center;height:100vh'>"
                "<div style='text-align:center'>"
                "<h1 style='color:#2dd4bf'>◈ Ruth</h1>"
                "<p>Frontend not built. Run <code>npm run build</code> in the frontend/ directory.</p>"
                "</div></body></html>"
            )

    return app
