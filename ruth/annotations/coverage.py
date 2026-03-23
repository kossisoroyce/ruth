"""Coverage ingestion for Ruth.

Reads coverage data from standard formats:
  - lcov.info (from Istanbul/nyc, gcov, etc.)
  - coverage.json (Python coverage.py)
  - cobertura XML

Maps coverage percentages back to source file paths.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def load_coverage(project_root: Path) -> dict[str, float]:
    """Auto-detect and load coverage data from a project.

    Returns:
        Dict mapping relative file paths to coverage percentage (0-100).
    """
    coverage: dict[str, float] = {}

    # Try lcov
    lcov_paths = [
        project_root / "coverage" / "lcov.info",
        project_root / "lcov.info",
        project_root / "coverage" / "lcov" / "lcov.info",
    ]
    for p in lcov_paths:
        if p.exists():
            coverage.update(_parse_lcov(p, project_root))
            return coverage

    # Try coverage.json (Python)
    cov_json_paths = [
        project_root / "coverage.json",
        project_root / "htmlcov" / "status.json",
    ]
    for p in cov_json_paths:
        if p.exists():
            coverage.update(_parse_coverage_json(p, project_root))
            return coverage

    # Try .coverage (Python coverage.py SQLite DB — just detect it)
    dot_coverage = project_root / ".coverage"
    if dot_coverage.exists():
        # Can't parse SQLite easily without coverage lib, skip
        pass

    return coverage


def _parse_lcov(path: Path, project_root: Path) -> dict[str, float]:
    """Parse lcov.info format."""
    coverage: dict[str, float] = {}
    current_file = None
    lines_hit = 0
    lines_found = 0

    for line in path.read_text(errors="ignore").splitlines():
        line = line.strip()
        if line.startswith("SF:"):
            current_file = line[3:]
            lines_hit = 0
            lines_found = 0
        elif line.startswith("LH:"):
            lines_hit = int(line[3:])
        elif line.startswith("LF:"):
            lines_found = int(line[3:])
        elif line == "end_of_record" and current_file:
            pct = (lines_hit / lines_found * 100) if lines_found > 0 else 0
            try:
                rel = str(Path(current_file).resolve().relative_to(project_root.resolve()))
            except ValueError:
                rel = current_file
            coverage[rel] = round(pct, 1)
            current_file = None

    return coverage


def _parse_coverage_json(path: Path, project_root: Path) -> dict[str, float]:
    """Parse Python coverage.py JSON report."""
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}

    coverage: dict[str, float] = {}

    # coverage.py format
    files = data.get("files", {})
    for file_path, file_data in files.items():
        summary = file_data.get("summary", {})
        pct = summary.get("percent_covered", 0)
        try:
            rel = str(Path(file_path).resolve().relative_to(project_root.resolve()))
        except ValueError:
            rel = file_path
        coverage[rel] = round(pct, 1)

    return coverage
