"""Cyclomatic complexity scoring for source code.

Uses a regex-based approach to count decision points:
  - if, elif, else, for, while, except, with, case (Python)
  - if, else if, for, while, catch, switch, case, ternary (JS/TS)
  - match, if, loop, while, for (Rust)
  - etc.

Returns a normalized 0-100 score where:
  0-20:  Low complexity
  20-40: Moderate
  40-60: High
  60-80: Very High
  80-100: Critical
"""

from __future__ import annotations

import re
from typing import Callable

# ── Language-specific decision point patterns ──────────────────────────

_PYTHON_BRANCHES = re.compile(
    r"\b(if|elif|for|while|except|with|and|or|assert)\b", re.MULTILINE
)

_JS_BRANCHES = re.compile(
    r"\b(if|else\s+if|for|while|do|catch|case|switch|\?\s*|&&|\|\|)\b", re.MULTILINE
)

_RUST_BRANCHES = re.compile(
    r"\b(if|else\s+if|match|for|while|loop|=>|&&|\|\|)\b", re.MULTILINE
)

_GO_BRANCHES = re.compile(
    r"\b(if|else\s+if|for|switch|case|select|&&|\|\|)\b", re.MULTILINE
)

_JAVA_BRANCHES = re.compile(
    r"\b(if|else\s+if|for|while|do|catch|case|switch|\?|&&|\|\|)\b", re.MULTILINE
)

_C_BRANCHES = re.compile(
    r"\b(if|else\s+if|for|while|do|case|switch|\?|&&|\|\|)\b", re.MULTILINE
)

_RUBY_BRANCHES = re.compile(
    r"\b(if|elsif|unless|while|until|for|rescue|when|and|or)\b", re.MULTILINE
)


BRANCH_PATTERNS: dict[str, re.Pattern] = {
    "python":     _PYTHON_BRANCHES,
    "typescript":  _JS_BRANCHES,
    "javascript":  _JS_BRANCHES,
    "rust":        _RUST_BRANCHES,
    "go":          _GO_BRANCHES,
    "java":        _JAVA_BRANCHES,
    "c":           _C_BRANCHES,
    "cpp":         _C_BRANCHES,
    "ruby":        _RUBY_BRANCHES,
}


def _strip_comments(content: str, language: str) -> str:
    """Remove comments and strings to avoid false positives."""
    # Remove single-line comments
    if language in ("python", "ruby"):
        content = re.sub(r"#.*$", "", content, flags=re.MULTILINE)
    else:
        content = re.sub(r"//.*$", "", content, flags=re.MULTILINE)

    # Remove multi-line comments
    if language == "python":
        content = re.sub(r'""".*?"""', "", content, flags=re.DOTALL)
        content = re.sub(r"'''.*?'''", "", content, flags=re.DOTALL)
    elif language in ("c", "cpp", "java", "javascript", "typescript", "go", "rust"):
        content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)

    # Remove strings (simplified — avoids counting keywords in strings)
    content = re.sub(r'"(?:[^"\\]|\\.)*"', '""', content)
    content = re.sub(r"'(?:[^'\\]|\\.)*'", "''", content)

    return content


def compute_complexity(content: str, language: str) -> int | None:
    """Compute a normalized complexity score for a source file.

    Args:
        content: The file content.
        language: The programming language.

    Returns:
        An integer 0-100, or None if language is unsupported.
    """
    pattern = BRANCH_PATTERNS.get(language)
    if pattern is None:
        return None

    cleaned = _strip_comments(content, language)
    line_count = cleaned.count("\n") + 1

    if line_count == 0:
        return 0

    # Count decision points
    branch_count = len(pattern.findall(cleaned))

    # Base complexity = 1 (every function has at least one path)
    # Cyclomatic = branches + 1
    cyclomatic = branch_count + 1

    # Normalize to 0-100 scale
    # Heuristic: density of branches per 100 lines
    density = (branch_count / max(line_count, 1)) * 100

    # Combine raw count and density
    # A 50-line file with 20 branches is more complex than a 500-line file with 20 branches
    raw_score = min(100, int(density * 2.5 + cyclomatic * 0.3))

    return max(0, min(100, raw_score))


def compute_function_complexity(body: str, language: str) -> int | None:
    """Compute complexity for a single function body."""
    return compute_complexity(body, language)
