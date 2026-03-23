"""Multi-language symbol extraction using regex-based parsing.

This module extracts imports, classes, functions, and call sites from source
files using language-specific regex patterns. It's designed as the initial
parser — a tree-sitter implementation can replace it for higher accuracy.

Supported: Python, TypeScript/JavaScript, Rust, Go, Java, Ruby, C/C++.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal


# ── Extracted symbol types ─────────────────────────────────────────────

@dataclass
class ImportInfo:
    """A detected import statement."""
    module: str              # What's being imported (e.g., "os.path")
    alias: str | None = None # Import alias
    names: list[str] = field(default_factory=list)  # Specific names imported
    line: int = 0


@dataclass
class ClassInfo:
    """A detected class definition."""
    name: str
    parent_class: str | None = None
    methods: list[str] = field(default_factory=list)
    properties: list[str] = field(default_factory=list)
    line: int = 0
    end_line: int = 0
    is_exported: bool = False


@dataclass
class FunctionInfo:
    """A detected function/method definition."""
    name: str
    params: list[str] = field(default_factory=list)
    return_type: str | None = None
    is_async: bool = False
    is_exported: bool = False
    line: int = 0
    end_line: int = 0
    body: str = ""


@dataclass
class CallSite:
    """A detected function call."""
    callee: str             # Function being called
    line: int = 0


@dataclass
class FileSymbols:
    """All symbols extracted from a single file."""
    imports: list[ImportInfo] = field(default_factory=list)
    classes: list[ClassInfo] = field(default_factory=list)
    functions: list[FunctionInfo] = field(default_factory=list)
    calls: list[CallSite] = field(default_factory=list)
    export_count: int = 0


# ═══════════════════════════════════════════════════════════════════════
# Python parser
# ═══════════════════════════════════════════════════════════════════════

_PY_IMPORT = re.compile(
    r"^(?:from\s+([\w.]+)\s+)?import\s+(.+)", re.MULTILINE
)
_PY_CLASS = re.compile(
    r"^class\s+(\w+)(?:\(([^)]*)\))?:", re.MULTILINE
)
_PY_FUNCTION = re.compile(
    r"^(\s*)(async\s+)?def\s+(\w+)\(([^)]*)\)(?:\s*->\s*([^\s:]+))?:", re.MULTILINE
)
_PY_CALL = re.compile(
    r"(?<![.\w])(\w[\w.]*)\s*\(", re.MULTILINE
)
_PY_ALL = re.compile(
    r"^__all__\s*=\s*\[([^\]]*)\]", re.MULTILINE
)


def _parse_python(content: str) -> FileSymbols:
    symbols = FileSymbols()
    lines = content.split("\n")

    # Imports
    for m in _PY_IMPORT.finditer(content):
        from_module = m.group(1)
        imports_str = m.group(2).strip()
        line = content[:m.start()].count("\n") + 1

        if from_module:
            names = [n.strip().split(" as ")[0].strip()
                     for n in imports_str.split(",")]
            symbols.imports.append(ImportInfo(
                module=from_module, names=names, line=line,
            ))
        else:
            for part in imports_str.split(","):
                part = part.strip()
                parts = part.split(" as ")
                symbols.imports.append(ImportInfo(
                    module=parts[0].strip(),
                    alias=parts[1].strip() if len(parts) > 1 else None,
                    line=line,
                ))

    # Classes
    for m in _PY_CLASS.finditer(content):
        name = m.group(1)
        parent = m.group(2).strip() if m.group(2) else None
        line = content[:m.start()].count("\n") + 1

        # Find methods within the class (indented defs)
        methods = []
        properties = []
        class_indent = len(m.group(0)) - len(m.group(0).lstrip())
        in_class = False
        for i, ln in enumerate(lines[line:], start=line + 1):
            stripped = ln.strip()
            if not stripped or stripped.startswith("#"):
                continue
            indent = len(ln) - len(ln.lstrip())
            if in_class and indent <= class_indent and stripped:
                break
            in_class = True
            if indent > class_indent:
                mf = re.match(r"\s*(?:async\s+)?def\s+(\w+)", ln)
                if mf:
                    methods.append(mf.group(1))
                mp = re.match(r"\s*self\.(\w+)\s*=", ln)
                if mp:
                    properties.append(mp.group(1))

        symbols.classes.append(ClassInfo(
            name=name, parent_class=parent,
            methods=methods, properties=list(set(properties)),
            line=line, is_exported=not name.startswith("_"),
        ))

    # Functions (module-level only — indent = 0)
    for m in _PY_FUNCTION.finditer(content):
        indent = m.group(1)
        is_async = bool(m.group(2))
        name = m.group(3)
        params_str = m.group(4)
        return_type = m.group(5)
        line = content[:m.start()].count("\n") + 1

        if len(indent) == 0:  # module-level
            params = [p.strip().split(":")[0].strip()
                      for p in params_str.split(",") if p.strip()]
            params = [p for p in params if p != "self" and p != "cls"]
            symbols.functions.append(FunctionInfo(
                name=name, params=params, return_type=return_type,
                is_async=is_async, is_exported=not name.startswith("_"),
                line=line,
            ))

    # Calls
    skip_calls = {"print", "len", "range", "str", "int", "float", "bool",
                  "list", "dict", "set", "tuple", "type", "super", "isinstance",
                  "issubclass", "hasattr", "getattr", "setattr", "enumerate",
                  "zip", "map", "filter", "sorted", "reversed", "any", "all",
                  "open", "next", "iter", "if", "for", "while", "with", "return"}
    for m in _PY_CALL.finditer(content):
        callee = m.group(1)
        if callee not in skip_calls and not callee.startswith("_"):
            line = content[:m.start()].count("\n") + 1
            symbols.calls.append(CallSite(callee=callee, line=line))

    # Export count
    all_match = _PY_ALL.search(content)
    if all_match:
        symbols.export_count = len([
            n.strip().strip("'\"")
            for n in all_match.group(1).split(",") if n.strip()
        ])
    else:
        symbols.export_count = sum(
            1 for f in symbols.functions if f.is_exported
        ) + sum(
            1 for c in symbols.classes if c.is_exported
        )

    return symbols


# ═══════════════════════════════════════════════════════════════════════
# TypeScript / JavaScript parser
# ═══════════════════════════════════════════════════════════════════════

_TS_IMPORT = re.compile(
    r"""import\s+(?:(?:\{([^}]*)\}|(\w+))\s+from\s+)?['"]([@\w./-]+)['"]""",
    re.MULTILINE,
)
_TS_REQUIRE = re.compile(
    r"""(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\(['"]([@\w./-]+)['"]\)""",
    re.MULTILINE,
)
_TS_CLASS = re.compile(
    r"^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?",
    re.MULTILINE,
)
_TS_FUNCTION = re.compile(
    r"^(?:export\s+)?(?:(async)\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w[\w<>\[\]|&, ]*))?",
    re.MULTILINE,
)
_TS_ARROW = re.compile(
    r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:(async)\s+)?\(([^)]*)\)(?:\s*:\s*(\w[\w<>\[\]|&, ]*))?\s*=>",
    re.MULTILINE,
)
_TS_EXPORT = re.compile(
    r"^export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)",
    re.MULTILINE,
)
_TS_CALL = re.compile(
    r"(?<![.\w])(\w[\w.]*)\s*\(", re.MULTILINE
)


def _parse_typescript(content: str) -> FileSymbols:
    symbols = FileSymbols()

    # Imports (ES6 + require)
    for m in _TS_IMPORT.finditer(content):
        named = m.group(1)
        default = m.group(2)
        module = m.group(3)
        line = content[:m.start()].count("\n") + 1
        names = []
        if named:
            names = [n.strip().split(" as ")[0].strip()
                     for n in named.split(",") if n.strip()]
        if default:
            names = [default]
        symbols.imports.append(ImportInfo(module=module, names=names, line=line))

    for m in _TS_REQUIRE.finditer(content):
        named = m.group(1)
        default = m.group(2)
        module = m.group(3)
        line = content[:m.start()].count("\n") + 1
        names = []
        if named:
            names = [n.strip() for n in named.split(",") if n.strip()]
        if default:
            names = [default]
        symbols.imports.append(ImportInfo(module=module, names=names, line=line))

    # Classes
    for m in _TS_CLASS.finditer(content):
        name = m.group(1)
        parent = m.group(2)
        line = content[:m.start()].count("\n") + 1
        is_exported = "export" in content[max(0,m.start()-20):m.start()+10]

        # Find methods (simplified)
        methods = []
        brace_count = 0
        started = False
        method_re = re.compile(r"^\s+(?:async\s+)?(?:static\s+)?(?:get\s+|set\s+)?(\w+)\s*\(")
        for ln in content[m.end():].split("\n"):
            brace_count += ln.count("{") - ln.count("}")
            if "{" in ln and not started:
                started = True
            if started and brace_count <= 0:
                break
            mm = method_re.match(ln)
            if mm and mm.group(1) != "constructor":
                methods.append(mm.group(1))

        symbols.classes.append(ClassInfo(
            name=name, parent_class=parent, methods=methods,
            line=line, is_exported=is_exported,
        ))

    # Functions
    for m in _TS_FUNCTION.finditer(content):
        is_async = bool(m.group(1))
        name = m.group(2)
        params_str = m.group(3)
        return_type = m.group(4)
        line = content[:m.start()].count("\n") + 1
        is_exported = "export" in content[max(0,m.start()-20):m.start()+10]
        params = [p.strip().split(":")[0].strip().split("=")[0].strip()
                  for p in params_str.split(",") if p.strip()]
        symbols.functions.append(FunctionInfo(
            name=name, params=params, return_type=return_type,
            is_async=is_async, is_exported=is_exported, line=line,
        ))

    # Arrow functions
    for m in _TS_ARROW.finditer(content):
        name = m.group(1)
        is_async = bool(m.group(2))
        params_str = m.group(3)
        return_type = m.group(4)
        line = content[:m.start()].count("\n") + 1
        is_exported = "export" in content[max(0,m.start()-20):m.start()+10]
        params = [p.strip().split(":")[0].strip().split("=")[0].strip()
                  for p in params_str.split(",") if p.strip()]
        symbols.functions.append(FunctionInfo(
            name=name, params=params, return_type=return_type,
            is_async=is_async, is_exported=is_exported, line=line,
        ))

    # Exports count
    symbols.export_count = len(_TS_EXPORT.findall(content))

    # Calls
    skip_calls = {"if", "for", "while", "switch", "catch", "return", "throw",
                  "new", "typeof", "void", "delete", "console", "require",
                  "import", "export", "from", "const", "let", "var"}
    for m in _TS_CALL.finditer(content):
        callee = m.group(1)
        if callee not in skip_calls:
            line = content[:m.start()].count("\n") + 1
            symbols.calls.append(CallSite(callee=callee, line=line))

    return symbols


# ═══════════════════════════════════════════════════════════════════════
# Rust parser
# ═══════════════════════════════════════════════════════════════════════

_RS_USE = re.compile(r"^use\s+([\w:{}*,\s]+);", re.MULTILINE)
_RS_STRUCT = re.compile(r"^(?:pub\s+)?struct\s+(\w+)", re.MULTILINE)
_RS_IMPL = re.compile(r"^impl(?:<[^>]*>)?\s+(\w+)", re.MULTILINE)
_RS_FN = re.compile(
    r"^(\s*)(?:pub\s+)?(?:(async)\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*->\s*(\S+))?",
    re.MULTILINE,
)
_RS_CALL = re.compile(r"(?<![.\w])(\w[\w:]*)\s*\(", re.MULTILINE)


def _parse_rust(content: str) -> FileSymbols:
    symbols = FileSymbols()

    for m in _RS_USE.finditer(content):
        path = m.group(1).strip()
        line = content[:m.start()].count("\n") + 1
        module = path.split("::")[0]
        symbols.imports.append(ImportInfo(module=module, line=line))

    for m in _RS_STRUCT.finditer(content):
        name = m.group(1)
        line = content[:m.start()].count("\n") + 1
        is_exported = "pub" in content[max(0,m.start()-10):m.start()+5]
        methods = []
        # Find impl block methods
        for im in _RS_IMPL.finditer(content):
            if im.group(1) == name:
                brace_count = 0
                started = False
                for ln in content[im.end():].split("\n"):
                    brace_count += ln.count("{") - ln.count("}")
                    if "{" in ln and not started:
                        started = True
                    if started and brace_count <= 0:
                        break
                    fn_match = re.match(r"\s+(?:pub\s+)?(?:async\s+)?fn\s+(\w+)", ln)
                    if fn_match:
                        methods.append(fn_match.group(1))
        symbols.classes.append(ClassInfo(
            name=name, methods=methods, line=line, is_exported=is_exported,
        ))

    for m in _RS_FN.finditer(content):
        indent = m.group(1)
        is_async = bool(m.group(2))
        name = m.group(3)
        params_str = m.group(4)
        return_type = m.group(5)
        line = content[:m.start()].count("\n") + 1
        if len(indent) == 0:  # module-level
            params = [p.strip().split(":")[0].strip()
                      for p in params_str.split(",")
                      if p.strip() and "self" not in p]
            is_exported = "pub" in content[max(0,m.start()-10):m.start()+5]
            symbols.functions.append(FunctionInfo(
                name=name, params=params, return_type=return_type,
                is_async=is_async, is_exported=is_exported, line=line,
            ))

    for m in _RS_CALL.finditer(content):
        callee = m.group(1)
        if callee not in {"if", "for", "while", "match", "loop", "return",
                          "Some", "None", "Ok", "Err", "vec", "println",
                          "eprintln", "format", "write", "writeln"}:
            line = content[:m.start()].count("\n") + 1
            symbols.calls.append(CallSite(callee=callee, line=line))

    symbols.export_count = content.count("pub fn ") + content.count("pub struct ")
    return symbols


# ═══════════════════════════════════════════════════════════════════════
# Go parser
# ═══════════════════════════════════════════════════════════════════════

_GO_IMPORT_SINGLE = re.compile(r'^import\s+"([^"]+)"', re.MULTILINE)
_GO_IMPORT_BLOCK = re.compile(r"^import\s*\((.*?)\)", re.MULTILINE | re.DOTALL)
_GO_STRUCT = re.compile(r"^type\s+(\w+)\s+struct\s*{", re.MULTILINE)
_GO_FUNC = re.compile(
    r"^func\s+(?:\(\w+\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*(?:\(([^)]*)\)|(\w[\w*. ]*)))?",
    re.MULTILINE,
)
_GO_CALL = re.compile(r"(?<![.\w])(\w[\w.]*)\s*\(", re.MULTILINE)


def _parse_go(content: str) -> FileSymbols:
    symbols = FileSymbols()

    for m in _GO_IMPORT_SINGLE.finditer(content):
        module = m.group(1)
        line = content[:m.start()].count("\n") + 1
        symbols.imports.append(ImportInfo(module=module, line=line))

    for m in _GO_IMPORT_BLOCK.finditer(content):
        block = m.group(1)
        base_line = content[:m.start()].count("\n") + 1
        for i, ln in enumerate(block.strip().split("\n")):
            ln = ln.strip().strip('"')
            if ln:
                symbols.imports.append(ImportInfo(module=ln, line=base_line + i))

    for m in _GO_STRUCT.finditer(content):
        name = m.group(1)
        line = content[:m.start()].count("\n") + 1
        is_exported = name[0].isupper()
        symbols.classes.append(ClassInfo(
            name=name, line=line, is_exported=is_exported,
        ))

    for m in _GO_FUNC.finditer(content):
        receiver_type = m.group(1)
        name = m.group(2)
        params_str = m.group(3)
        return_multi = m.group(4)
        return_single = m.group(5)
        line = content[:m.start()].count("\n") + 1
        is_exported = name[0].isupper() if name else False

        params = [p.strip().split(" ")[0] for p in params_str.split(",") if p.strip()]
        return_type = return_single or return_multi

        if receiver_type:
            # Method — add to struct's methods
            for cls in symbols.classes:
                if cls.name == receiver_type:
                    cls.methods.append(name)
                    break
        else:
            symbols.functions.append(FunctionInfo(
                name=name, params=params, return_type=return_type,
                is_exported=is_exported, line=line,
            ))

    for m in _GO_CALL.finditer(content):
        callee = m.group(1)
        if callee not in {"if", "for", "range", "switch", "select", "go",
                          "defer", "return", "make", "new", "len", "cap",
                          "append", "copy", "delete", "close", "panic",
                          "recover", "print", "println", "fmt"}:
            line = content[:m.start()].count("\n") + 1
            symbols.calls.append(CallSite(callee=callee, line=line))

    symbols.export_count = sum(
        1 for f in symbols.functions if f.is_exported
    ) + sum(
        1 for c in symbols.classes if c.is_exported
    )
    return symbols


# ═══════════════════════════════════════════════════════════════════════
# Java parser
# ═══════════════════════════════════════════════════════════════════════

_JV_IMPORT = re.compile(r"^import\s+([\w.]+)(?:\.\*)?;", re.MULTILINE)
_JV_CLASS = re.compile(
    r"^(?:public\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?",
    re.MULTILINE,
)
_JV_METHOD = re.compile(
    r"^\s+(?:public|private|protected)?\s*(?:static\s+)?(?:(synchronized)\s+)?(\w[\w<>\[\],\s]*)\s+(\w+)\s*\(([^)]*)\)",
    re.MULTILINE,
)


def _parse_java(content: str) -> FileSymbols:
    symbols = FileSymbols()

    for m in _JV_IMPORT.finditer(content):
        module = m.group(1)
        line = content[:m.start()].count("\n") + 1
        symbols.imports.append(ImportInfo(module=module, line=line))

    for m in _JV_CLASS.finditer(content):
        name = m.group(1)
        parent = m.group(2)
        line = content[:m.start()].count("\n") + 1
        symbols.classes.append(ClassInfo(
            name=name, parent_class=parent, line=line, is_exported=True,
        ))

    for m in _JV_METHOD.finditer(content):
        return_type = m.group(2).strip()
        name = m.group(3)
        params_str = m.group(4)
        line = content[:m.start()].count("\n") + 1
        params = [p.strip().split(" ")[-1] for p in params_str.split(",") if p.strip()]
        vis = content[max(0,m.start()-30):m.start()+20]
        symbols.functions.append(FunctionInfo(
            name=name, params=params, return_type=return_type,
            is_exported="public" in vis, line=line,
        ))

    symbols.export_count = sum(1 for f in symbols.functions if f.is_exported)
    return symbols


# ═══════════════════════════════════════════════════════════════════════
# Ruby parser
# ═══════════════════════════════════════════════════════════════════════

_RB_REQUIRE = re.compile(r"^require\s+['\"]([^'\"]+)['\"]", re.MULTILINE)
_RB_CLASS = re.compile(r"^class\s+(\w+)(?:\s*<\s*(\w+))?", re.MULTILINE)
_RB_DEF = re.compile(r"^(\s*)def\s+(self\.)?(\w+)(?:\(([^)]*)\))?", re.MULTILINE)


def _parse_ruby(content: str) -> FileSymbols:
    symbols = FileSymbols()

    for m in _RB_REQUIRE.finditer(content):
        module = m.group(1)
        line = content[:m.start()].count("\n") + 1
        symbols.imports.append(ImportInfo(module=module, line=line))

    for m in _RB_CLASS.finditer(content):
        name = m.group(1)
        parent = m.group(2)
        line = content[:m.start()].count("\n") + 1
        symbols.classes.append(ClassInfo(
            name=name, parent_class=parent, line=line, is_exported=True,
        ))

    for m in _RB_DEF.finditer(content):
        indent = m.group(1)
        name = m.group(3)
        params_str = m.group(4) or ""
        line = content[:m.start()].count("\n") + 1
        if len(indent) == 0:
            params = [p.strip() for p in params_str.split(",") if p.strip()]
            symbols.functions.append(FunctionInfo(
                name=name, params=params, is_exported=True, line=line,
            ))

    symbols.export_count = len(symbols.functions) + len(symbols.classes)
    return symbols


# ═══════════════════════════════════════════════════════════════════════
# C / C++ parser (simplified)
# ═══════════════════════════════════════════════════════════════════════

_C_INCLUDE = re.compile(r'^#include\s+[<"]([^>"]+)[>"]', re.MULTILINE)
_C_FUNC = re.compile(
    r"^(\w[\w*\s]+)\s+(\w+)\s*\(([^)]*)\)\s*{",
    re.MULTILINE,
)
_CPP_CLASS = re.compile(
    r"^class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?",
    re.MULTILINE,
)


def _parse_c_cpp(content: str) -> FileSymbols:
    symbols = FileSymbols()

    for m in _C_INCLUDE.finditer(content):
        module = m.group(1)
        line = content[:m.start()].count("\n") + 1
        symbols.imports.append(ImportInfo(module=module, line=line))

    for m in _CPP_CLASS.finditer(content):
        name = m.group(1)
        parent = m.group(2)
        line = content[:m.start()].count("\n") + 1
        symbols.classes.append(ClassInfo(
            name=name, parent_class=parent, line=line, is_exported=True,
        ))

    for m in _C_FUNC.finditer(content):
        return_type = m.group(1).strip()
        name = m.group(2)
        params_str = m.group(3)
        line = content[:m.start()].count("\n") + 1
        if name not in {"if", "for", "while", "switch", "main"}:
            params = [p.strip().split(" ")[-1].strip("*&")
                      for p in params_str.split(",") if p.strip() and p.strip() != "void"]
            symbols.functions.append(FunctionInfo(
                name=name, params=params, return_type=return_type,
                is_exported=True, line=line,
            ))

    symbols.export_count = len(symbols.functions)
    return symbols


# ═══════════════════════════════════════════════════════════════════════
# Dispatch
# ═══════════════════════════════════════════════════════════════════════

PARSERS: dict[str, type] = {
    "python":     _parse_python,
    "typescript":  _parse_typescript,
    "javascript":  _parse_typescript,   # Same syntax
    "rust":        _parse_rust,
    "go":          _parse_go,
    "java":        _parse_java,
    "ruby":        _parse_ruby,
    "c":           _parse_c_cpp,
    "cpp":         _parse_c_cpp,
}


def parse_file(content: str, language: str) -> FileSymbols:
    """Parse a source file and extract all symbols.

    Args:
        content: The file content as a string.
        language: The detected language (python, typescript, etc.)

    Returns:
        FileSymbols with all extracted imports, classes, functions, calls.
    """
    parser = PARSERS.get(language)
    if parser is None:
        return FileSymbols()
    try:
        return parser(content)
    except Exception:
        # Parsing should never crash — return empty on error
        return FileSymbols()
