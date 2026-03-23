<p align="center">
  <img src="frontend/public/logo.svg" width="80" alt="Ruth" />
</p>

<h1 align="center">Ruth</h1>

<p align="center">
  <strong>Google Maps for your codebase.</strong>
  <br />
  <em>Navigate, understand, and explore any codebase as an interactive visual map.</em>
</p>

<p align="center">
  <a href="https://pypi.org/project/ruth-code/"><img src="https://img.shields.io/pypi/v/ruth-code?color=%232dd4bf&label=PyPI" alt="PyPI" /></a>
  <a href="https://pypi.org/project/ruth-code/"><img src="https://img.shields.io/pypi/pyversions/ruth-code?color=%232dd4bf" alt="Python" /></a>
  <a href="https://github.com/kossisoroyce/ruth/blob/main/LICENSE"><img src="https://img.shields.io/github/license/kossisoroyce/ruth?color=%232dd4bf" alt="License" /></a>
</p>

---

Ruth parses your codebase, builds a full dependency graph, auto-detects architectural landmarks, overlays quality metrics, and renders everything as a live, explorable map in the browser. Think of it as satellite view for software — zoom in on any file, trace dependency paths between modules, and spot architectural patterns at a glance.

## Install

```bash
pip install ruth-code
```

## Quick Start

```bash
ruth serve ./your-project
```

Your browser opens to `http://localhost:4150` with a live topology map of your codebase.

<br />

## Features

### Landmarks & Points of Interest

Ruth auto-detects the architecturally significant files in your project and pins them on the map:

| Landmark | What it means | How it's detected |
|----------|--------------|-------------------|
| **Entry Point** | Where execution begins | `main.py`, `index.ts`, `cli.py`, `app.py`, etc. |
| **Orchestrator** | Wires your app together | High out-degree — imports many other modules |
| **Hub** | Core dependency everyone relies on | High in-degree — imported by many modules |
| **Island** | Disconnected file, possibly dead code | Zero in-degree and zero out-degree |

### Dependency Path Tracing

Click two nodes to trace the import chain between them — like getting directions on a map. The full dependency route highlights across the graph so you can see exactly how module A reaches module Z.

### Traffic Lanes

Import edges scale in thickness based on connection weight. Heavily coupled modules get visually thicker lanes, making it easy to spot tight coupling and high-traffic corridors in your architecture.

### Code Preview

Click any node and hit **View Code** to instantly preview the source file — line numbers, syntax, and a copy button. No need to leave the map.

### Overlays

Switch between views like map layers:

| Overlay | What it shows |
|---------|--------------|
| **Complexity** | Cyclomatic complexity heatmap (green to red) |
| **Security** | Vulnerability overlay via Semgrep/OSV |
| **Coverage** | Test coverage mapping from lcov/coverage.json |

### Live Updates

WebSocket-powered real-time graph. Edit a file, save it, and watch the map update.

### Multi-Language

Full parsing support for **Python**, **TypeScript**, **JavaScript**, **Rust**, **Go**, **Java**, **Ruby**, and **C/C++**.

<br />

## Commands

### `ruth serve`

Start the visualization dashboard.

```bash
ruth serve /path/to/project
ruth serve . --port 8080          # custom port
ruth serve . --no-open            # don't auto-open browser
```

If the port is taken, Ruth automatically finds the next available one.

### `ruth analyze`

Export the dependency graph as JSON for CI pipelines or custom tooling.

```bash
ruth analyze /path/to/project -o graph.json
ruth analyze . -g function         # function-level granularity
ruth analyze . -g class            # class-level granularity
```

### `ruth scan`

Quick project scan — file counts, line counts, and language breakdown without building the full graph.

```bash
ruth scan /path/to/project
```

<br />

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| <kbd>Cmd</kbd> + <kbd>K</kbd> | Command palette — search and jump to any node |
| <kbd>/</kbd> | Focus the search filter |

<br />

## How It Works

```
your-project/
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Discovery │───▶│  Parser  │───▶│  Graph   │───▶│ Frontend │
│           │    │          │    │  Engine  │    │          │
│ Scan files│    │ tree-    │    │ Nodes,   │    │ React    │
│ by lang   │    │ sitter   │    │ edges,   │    │ Flow +   │
│           │    │ AST      │    │ roles,   │    │ WebSocket│
│           │    │ parsing  │    │ overlays │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

1. **Discovery** — Walks your project tree, identifies source files by language, respects `.gitignore`
2. **Parsing** — Extracts imports, exports, classes, and functions using tree-sitter ASTs
3. **Graph Engine** — Builds the dependency graph, detects landmarks via topology analysis, accumulates edge weights
4. **Frontend** — Renders the interactive map with React Flow, dagre layout, and real-time WebSocket updates

<br />

## API

Ruth exposes a local REST API alongside the dashboard:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Server status and connection count |
| `GET /api/graph` | Full dependency graph as JSON |
| `GET /api/file?path=<relative-path>` | Source file contents (path-traversal protected) |
| `WS /ws` | WebSocket for real-time graph updates |

<br />

## Development

```bash
# Clone
git clone https://github.com/kossisoroyce/ruth.git
cd ruth

# Backend
pip install -e ".[dev]"

# Frontend
cd frontend
npm install
npm run dev
```

The dev server proxies API requests to the Python backend. Run `ruth serve .` in one terminal and `npm run dev` in another for hot-reload frontend development.

<br />

## Requirements

- Python 3.10+
- No runtime dependencies beyond pip — the frontend ships pre-built in the wheel

## License

MIT — [Electric Sheep Africa](https://electricsheep.africa)
