"""File discovery and language detection for Ruth.

Walks a project directory, respects gitignore, detects languages, and returns
a list of source files to parse.
"""

from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Iterator

# ── Language detection by file extension ────────────────────────────────

EXTENSION_MAP: dict[str, str] = {
    ".py":   "python",
    ".pyi":  "python",
    ".ts":   "typescript",
    ".tsx":  "typescript",
    ".js":   "javascript",
    ".jsx":  "javascript",
    ".mjs":  "javascript",
    ".cjs":  "javascript",
    ".rs":   "rust",
    ".go":   "go",
    ".java": "java",
    ".rb":   "ruby",
    ".c":    "c",
    ".h":    "c",
    ".cpp":  "cpp",
    ".cc":   "cpp",
    ".cxx":  "cpp",
    ".hpp":  "cpp",
}

# Directories to always skip
SKIP_DIRS: set[str] = {
    ".git", ".svn", ".hg",
    "node_modules", "__pycache__", ".mypy_cache", ".pytest_cache",
    ".tox", ".nox", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt",
    "target",        # Rust
    "vendor",        # Go
    ".cargo",
    ".eggs", "*.egg-info",
    "coverage", ".coverage",
    ".idea", ".vscode",
}

# Files to skip
SKIP_FILES: set[str] = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Cargo.lock", "go.sum", "poetry.lock",
}

# Max file size to parse (500KB — skip minified bundles etc.)
MAX_FILE_SIZE = 500_000


@dataclass
class SourceFile:
    """A source file discovered in the project."""
    path: Path
    relative_path: str        # relative to project root
    language: str
    size: int
    line_count: int = 0
    content: str = ""

    @property
    def directory(self) -> str:
        """Parent directory relative path."""
        parent = str(Path(self.relative_path).parent)
        return parent if parent != "." else ""


@dataclass
class DiscoveryResult:
    """Results of project file discovery."""
    files: list[SourceFile] = field(default_factory=list)
    languages: set[str] = field(default_factory=set)
    directories: set[str] = field(default_factory=set)
    total_lines: int = 0
    skipped: int = 0


def detect_language(path: Path) -> str | None:
    """Detect language from file extension."""
    return EXTENSION_MAP.get(path.suffix.lower())


def should_skip_dir(name: str) -> bool:
    """Check if a directory should be skipped."""
    return name in SKIP_DIRS or name.startswith(".")


def should_skip_file(name: str, size: int) -> bool:
    """Check if a file should be skipped."""
    if name in SKIP_FILES:
        return True
    if size > MAX_FILE_SIZE:
        return True
    return False


def _parse_gitignore(project_root: Path) -> list[str]:
    """Parse .gitignore patterns (simple implementation)."""
    gitignore = project_root / ".gitignore"
    if not gitignore.exists():
        return []
    patterns = []
    for line in gitignore.read_text(errors="ignore").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            patterns.append(line)
    return patterns


def _matches_gitignore(rel_path: str, patterns: list[str]) -> bool:
    """Simple gitignore matching (directory and file patterns)."""
    parts = rel_path.split(os.sep)
    for pattern in patterns:
        clean = pattern.rstrip("/")
        # Directory match
        if clean in parts:
            return True
        # Simple glob suffix match
        if clean.startswith("*") and rel_path.endswith(clean[1:]):
            return True
        # Exact match
        if rel_path == clean:
            return True
    return False


def discover_files(
    project_root: Path,
    max_files: int = 5000,
) -> DiscoveryResult:
    """Walk the project directory and discover parseable source files.

    Args:
        project_root: Root directory to scan.
        max_files: Max files to process (safety limit for huge repos).

    Returns:
        DiscoveryResult with all discovered source files.
    """
    result = DiscoveryResult()
    project_root = project_root.resolve()
    gitignore_patterns = _parse_gitignore(project_root)

    for dirpath, dirnames, filenames in os.walk(project_root, topdown=True):
        # Filter out skipped directories in-place
        dirnames[:] = [
            d for d in dirnames
            if not should_skip_dir(d)
        ]

        rel_dir = os.path.relpath(dirpath, project_root)

        # Check gitignore for directory
        if rel_dir != "." and _matches_gitignore(rel_dir, gitignore_patterns):
            dirnames.clear()
            continue

        for filename in filenames:
            if len(result.files) >= max_files:
                result.skipped += 1
                continue

            filepath = Path(dirpath) / filename
            rel_path = os.path.relpath(filepath, project_root)

            # Skip by gitignore
            if _matches_gitignore(rel_path, gitignore_patterns):
                result.skipped += 1
                continue

            # Detect language
            language = detect_language(filepath)
            if language is None:
                continue

            # Skip large/binary files
            try:
                size = filepath.stat().st_size
            except OSError:
                continue

            if should_skip_file(filename, size):
                result.skipped += 1
                continue

            # Read content
            try:
                content = filepath.read_text(encoding="utf-8", errors="ignore")
            except (OSError, UnicodeDecodeError):
                result.skipped += 1
                continue

            line_count = content.count("\n") + (1 if content and not content.endswith("\n") else 0)

            source_file = SourceFile(
                path=filepath,
                relative_path=rel_path,
                language=language,
                size=size,
                line_count=line_count,
                content=content,
            )

            result.files.append(source_file)
            result.languages.add(language)
            result.total_lines += line_count

            # Track directories
            directory = source_file.directory
            if directory:
                # Add all parent directories too
                parts = Path(directory).parts
                for i in range(len(parts)):
                    result.directories.add(str(Path(*parts[: i + 1])))

    return result
