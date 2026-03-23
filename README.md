# Ruth

**Google Maps for your codebase.**

Ruth parses your codebase, builds a dependency graph, detects landmarks (entry points, orchestrators, hubs), overlays code quality metrics, and renders it as an explorable visual map in the browser.

## Install

```bash
pip install ruth-code
```

## Quick Start

```bash
ruth serve ./your-project
```

Open `http://localhost:4150` and explore.

## What You Get

**Landmarks & Points of Interest** — Ruth auto-detects the key files in your codebase:
- **Entry Points** — `main.py`, `index.ts`, `cli.py` — where execution begins
- **Orchestrators** — files that import many modules, wiring your app together
- **Hubs** — core dependencies imported by everyone
- **Islands** — disconnected files that may be dead code

**Dependency Path Tracing** — Click two nodes to trace the import chain between them, like getting directions on a map.

**Traffic Lanes** — Import edges scale in thickness based on how heavily two files are connected.

**Overlays** — Switch between views like map layers:
- **Complexity** — cyclomatic complexity heatmap (green to red)
- **Security** — vulnerability overlay (Semgrep/OSV integration)
- **Coverage** — test coverage mapping (lcov/coverage.json)

**Multi-Language** — Python, TypeScript, JavaScript, Rust, Go, Java, Ruby, C/C++.

**Live** — WebSocket-powered real-time updates. Edit a file, see the graph change.

## Commands

```bash
# Start the visualization dashboard
ruth serve /path/to/project

# Analyze and output graph as JSON
ruth analyze /path/to/project -o graph.json

# Quick project scan
ruth scan /path/to/project
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` | Command palette — search and jump to any node |
| `/` | Focus search filter |

## Requirements

- Python 3.10+
- Node.js (for development only — the frontend is pre-built)

## License

MIT — Electric Sheep Africa
