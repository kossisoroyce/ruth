"""Graph engine — builds React Flow-compatible nodes and edges from parsed symbols.

Takes the output of the parser layer (discovered files + extracted symbols)
and produces a graph structure matching the frontend TypeScript types exactly.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from ruth.parser.discovery import SourceFile, DiscoveryResult
from ruth.parser.symbols import FileSymbols, parse_file
from ruth.annotations.complexity import compute_complexity


def _node_id(kind: str, name: str, file_path: str) -> str:
    """Generate a stable, unique node ID."""
    raw = f"{kind}:{file_path}:{name}"
    return hashlib.sha1(raw.encode()).hexdigest()[:12]


def _edge_id(source: str, target: str, kind: str) -> str:
    """Generate a stable edge ID."""
    raw = f"{kind}:{source}->{target}"
    return hashlib.sha1(raw.encode()).hexdigest()[:12]


def build_graph(
    discovery: DiscoveryResult,
    project_root: Path,
    granularity: str = "module",  # module | class | function
) -> dict[str, Any]:
    """Build the full graph from discovery results.

    Args:
        discovery: Result from file discovery.
        project_root: Root path of the project.
        granularity: Level of detail for nodes.

    Returns:
        Dict matching the frontend FullGraphPayload type.
    """
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    seen_nodes: dict[str, str] = {}   # key -> node_id
    module_symbols: dict[str, FileSymbols] = {}  # rel_path -> symbols

    # Phase 1: Parse all files and create module nodes
    for source_file in discovery.files:
        symbols = parse_file(source_file.content, source_file.language)
        module_symbols[source_file.relative_path] = symbols

        # Create module node
        node_id = _node_id("module", source_file.relative_path, source_file.relative_path)
        seen_nodes[source_file.relative_path] = node_id

        complexity = compute_complexity(source_file.content, source_file.language)

        module_node = {
            "id": node_id,
            "type": "module",
            "position": {"x": 0, "y": 0},
            "data": {
                "label": Path(source_file.relative_path).stem,
                "kind": "module",
                "language": source_file.language,
                "filePath": source_file.relative_path,
                "annotations": {
                    "complexity": complexity,
                    "vulnerabilities": [],
                    "coverage": None,
                },
                "exportCount": symbols.export_count,
                "importCount": len(symbols.imports),
                "lineCount": source_file.line_count,
            },
        }
        nodes.append(module_node)

        # Phase 1b: Create class and function nodes if granularity allows
        if granularity in ("class", "function"):
            for cls in symbols.classes:
                cls_id = _node_id("class", cls.name, source_file.relative_path)
                seen_nodes[f"{source_file.relative_path}::{cls.name}"] = cls_id
                cls_node = {
                    "id": cls_id,
                    "type": "class",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "label": cls.name,
                        "kind": "class",
                        "language": source_file.language,
                        "filePath": source_file.relative_path,
                        "annotations": {
                            "complexity": None,
                            "vulnerabilities": [],
                            "coverage": None,
                        },
                        "methodCount": len(cls.methods),
                        "propertyCount": len(cls.properties),
                        "parentClass": cls.parent_class,
                    },
                }
                nodes.append(cls_node)
                # Edge from module to class
                edges.append({
                    "id": _edge_id(node_id, cls_id, "contains"),
                    "source": node_id,
                    "target": cls_id,
                    "type": "import",
                    "data": {"edgeKind": "import"},
                })

        if granularity == "function":
            for func in symbols.functions:
                func_id = _node_id("function", func.name, source_file.relative_path)
                seen_nodes[f"{source_file.relative_path}::{func.name}"] = func_id
                func_node = {
                    "id": func_id,
                    "type": "function",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "label": func.name,
                        "kind": "function",
                        "language": source_file.language,
                        "filePath": source_file.relative_path,
                        "annotations": {
                            "complexity": None,
                            "vulnerabilities": [],
                            "coverage": None,
                        },
                        "params": func.params,
                        "returnType": func.return_type,
                        "isAsync": func.is_async,
                        "isExported": func.is_exported,
                    },
                }
                nodes.append(func_node)

    # Phase 2: Create directory supernodes
    for directory in sorted(discovery.directories):
        dir_id = _node_id("directory", directory, directory)
        child_count = sum(
            1 for f in discovery.files if f.directory == directory
        )
        dir_node = {
            "id": dir_id,
            "type": "directory",
            "position": {"x": 0, "y": 0},
            "data": {
                "label": Path(directory).name,
                "kind": "directory",
                "language": "unknown",
                "filePath": directory,
                "annotations": {
                    "complexity": None,
                    "vulnerabilities": [],
                    "coverage": None,
                },
                "childCount": child_count,
                "isExpanded": True,
            },
        }
        nodes.append(dir_node)
        seen_nodes[f"dir:{directory}"] = dir_id

    # Phase 3: Create import edges between modules
    for source_file in discovery.files:
        symbols = module_symbols[source_file.relative_path]
        source_id = seen_nodes[source_file.relative_path]

        for imp in symbols.imports:
            target_id = _resolve_import(
                imp.module, source_file, discovery.files, seen_nodes
            )
            if target_id and target_id != source_id:
                eid = _edge_id(source_id, target_id, "import")
                # Accumulate weight for duplicate edges (traffic lanes)
                existing = next((e for e in edges if e["id"] == eid), None)
                if existing:
                    existing["data"]["weight"] = existing["data"].get("weight", 1) + 1
                else:
                    edges.append({
                        "id": eid,
                        "source": source_id,
                        "target": target_id,
                        "type": "import",
                        "data": {"edgeKind": "import", "weight": 1},
                    })

    # Phase 4: Create call edges (match calls to known functions)
    if granularity == "function":
        all_functions = {}
        for source_file in discovery.files:
            syms = module_symbols[source_file.relative_path]
            for func in syms.functions:
                key = f"{source_file.relative_path}::{func.name}"
                if key in seen_nodes:
                    all_functions[func.name] = seen_nodes[key]

        for source_file in discovery.files:
            syms = module_symbols[source_file.relative_path]
            for call in syms.calls:
                # Simple name match
                callee_name = call.callee.split(".")[-1]
                if callee_name in all_functions:
                    source_func_id = None
                    # Try to find which function this call is in
                    for func in syms.functions:
                        if func.line <= call.line:
                            source_func_id = seen_nodes.get(
                                f"{source_file.relative_path}::{func.name}"
                            )
                    if source_func_id is None:
                        source_func_id = seen_nodes.get(source_file.relative_path)
                    target_func_id = all_functions[callee_name]
                    if source_func_id and target_func_id and source_func_id != target_func_id:
                        eid = _edge_id(source_func_id, target_func_id, "call")
                        if not any(e["id"] == eid for e in edges):
                            edges.append({
                                "id": eid,
                                "source": source_func_id,
                                "target": target_func_id,
                                "type": "call",
                                "data": {"edgeKind": "call"},
                            })

    # Phase 5: Detect landmarks (POIs) — like Google Maps pins
    _detect_landmarks(nodes, edges, module_symbols)

    return {
        "nodes": nodes,
        "edges": edges,
        "projectName": project_root.name,
        "languages": sorted(discovery.languages),
    }


# ── Entry-point filename patterns ────────────────────────────────────────
_ENTRYPOINT_STEMS = {
    "main", "index", "app", "cli", "server", "manage", "wsgi", "asgi",
    "__main__", "run", "start", "entry", "boot",
}

# Config-like filenames
_CONFIG_STEMS = {
    "config", "settings", "configuration", "conf", "constants", "env",
    "setup", "webpack.config", "vite.config", "tsconfig", "eslint.config",
    "pyproject", "package",
}


def _detect_landmarks(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    module_symbols: dict[str, FileSymbols],
) -> None:
    """Detect and tag landmark nodes — the 'points of interest' of the codebase.

    Roles:
        entrypoint  — main/index/cli files (like a Google Maps 'start here' pin)
        orchestrator — files with the most outgoing imports (they wire everything together)
        hub         — files imported by the most other files (central dependencies)
        config      — configuration/settings files
        island      — files with zero connections (isolated, potential dead code)
    """
    module_nodes = [n for n in nodes if n["type"] == "module"]
    if not module_nodes:
        return

    # Build adjacency counts
    out_degree: dict[str, int] = {}  # node_id -> number of outgoing edges
    in_degree: dict[str, int] = {}   # node_id -> number of incoming edges
    for edge in edges:
        if edge["data"]["edgeKind"] == "import":
            out_degree[edge["source"]] = out_degree.get(edge["source"], 0) + 1
            in_degree[edge["target"]] = in_degree.get(edge["target"], 0) + 1

    # Thresholds for orchestrator/hub (top percentile)
    all_out = sorted(out_degree.values()) if out_degree else [0]
    all_in = sorted(in_degree.values()) if in_degree else [0]
    orchestrator_threshold = all_out[int(len(all_out) * 0.85)] if len(all_out) > 2 else 3
    hub_threshold = all_in[int(len(all_in) * 0.85)] if len(all_in) > 2 else 3
    orchestrator_threshold = max(orchestrator_threshold, 3)
    hub_threshold = max(hub_threshold, 3)

    for node in module_nodes:
        nid = node["id"]
        file_path = node["data"]["filePath"]
        stem = Path(file_path).stem.lower()
        out = out_degree.get(nid, 0)
        inp = in_degree.get(nid, 0)

        roles: list[str] = []

        # 1. Entry points — by filename convention
        if stem in _ENTRYPOINT_STEMS:
            roles.append("entrypoint")

        # 2. Config files
        if stem in _CONFIG_STEMS:
            roles.append("config")

        # 3. Orchestrators — files that import many others (wiring files)
        if out >= orchestrator_threshold and out > inp:
            roles.append("orchestrator")

        # 4. Hubs — files imported by many others (core libraries)
        if inp >= hub_threshold and inp >= out:
            roles.append("hub")

        # 5. Islands — zero connections
        if out == 0 and inp == 0:
            roles.append("island")

        # Write into node data
        node["data"]["roles"] = roles
        node["data"]["inDegree"] = inp
        node["data"]["outDegree"] = out

    # Also tag directory nodes with empty roles
    for node in nodes:
        if node["type"] == "directory":
            node["data"]["roles"] = []
            node["data"]["inDegree"] = 0
            node["data"]["outDegree"] = 0


def _resolve_import(
    module_name: str,
    source_file: SourceFile,
    all_files: list[SourceFile],
    seen_nodes: dict[str, str],
) -> str | None:
    """Try to resolve an import string to a known module node ID.

    Handles relative imports and various module naming conventions.
    """
    # Normalize module name to possible filenames
    candidates = []

    # Direct match: "foo.bar" → "foo/bar.py", "foo/bar.ts", etc.
    parts = module_name.replace(".", "/").replace("::", "/")
    candidates.append(parts)

    # Try with various extensions
    for ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".go", ".java", ".rb"):
        candidates.append(f"{parts}{ext}")
        candidates.append(f"{parts}/index{ext}")
        candidates.append(f"{parts}/mod{ext}")

    # For relative imports, try relative to source file
    source_dir = str(Path(source_file.relative_path).parent)
    if source_dir != ".":
        for ext in (".py", ".ts", ".tsx", ".js", ".jsx"):
            candidates.append(f"{source_dir}/{parts}{ext}")
            candidates.append(f"{source_dir}/{parts}/index{ext}")

    # Try npm-style: @scope/package → node_modules/...
    # For now just match by filename stem
    module_stem = parts.split("/")[-1]

    # Search seen_nodes
    for candidate in candidates:
        if candidate in seen_nodes:
            return seen_nodes[candidate]

    # Fuzzy: match by filename stem
    for file_path, node_id in seen_nodes.items():
        if file_path.startswith("dir:"):
            continue
        file_stem = Path(file_path).stem
        if file_stem == module_stem:
            return node_id
        # Try "index" files in matching directory
        if file_stem in ("index", "mod", "__init__"):
            file_dir = Path(file_path).parent.name
            if file_dir == module_stem:
                return node_id

    return None
