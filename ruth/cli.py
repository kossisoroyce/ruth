"""Ruth CLI — entry point for `ruth serve` and related commands."""

from __future__ import annotations

import click
from rich.console import Console
from rich.table import Table

console = Console()


@click.group()
@click.version_option(package_name="ruth")
def cli():
    """Ruth — Interactive Codebase Topology Visualizer.

    Parses your codebase, builds a dependency/call graph, overlays code quality
    and security metadata, then renders it as an explorable visual map.
    """
    pass


@cli.command()
@click.argument("path", default=".", type=click.Path(exists=True))
@click.option("--port", "-p", default=4150, help="Port to serve the dashboard on.")
@click.option("--host", "-h", default="127.0.0.1", help="Host to bind to.")
@click.option("--no-open", is_flag=True, help="Don't auto-open the browser.")
def serve(path: str, port: int, host: str, no_open: bool):
    """Start Ruth server and launch the visualization dashboard.

    PATH is the root directory of the codebase to analyze (defaults to current dir).
    """
    import webbrowser
    from pathlib import Path as P
    from ruth.server import create_app
    from ruth.parser.discovery import discover_files

    project_root = P(path).resolve()

    console.print()
    console.print("[bold cyan]◈ ruth[/bold cyan] [dim]v0.1.0[/dim]")
    console.print()

    # Quick scan to show stats
    with console.status("[dim]Scanning project...[/dim]"):
        discovery = discover_files(project_root)

    # Stats table
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column(style="dim")
    table.add_column(style="bold")
    table.add_row("Project", str(project_root))
    table.add_row("Files", str(len(discovery.files)))
    table.add_row("Lines", f"{discovery.total_lines:,}")
    table.add_row("Languages", ", ".join(sorted(discovery.languages)) or "—")
    table.add_row("Directories", str(len(discovery.directories)))
    if discovery.skipped:
        table.add_row("Skipped", str(discovery.skipped))
    console.print(table)
    console.print()
    console.print(f"  [dim]Dashboard:[/dim]  [link=http://{host}:{port}]http://{host}:{port}[/link]")
    console.print()

    app = create_app(path)

    # Find a free port — auto-increment if the requested one is taken
    import socket
    actual_port = port
    for attempt in range(20):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, actual_port))
            break
        except OSError:
            if attempt == 0:
                console.print(f"  [yellow]⚠[/yellow]  Port {actual_port} in use, finding next available...")
            actual_port += 1
    else:
        console.print(f"  [red]✗[/red]  No available port found in range {port}–{actual_port}")
        raise SystemExit(1)

    if actual_port != port:
        console.print(f"  [dim]Dashboard:[/dim]  [link=http://{host}:{actual_port}]http://{host}:{actual_port}[/link]")
        console.print()

    if not no_open:
        webbrowser.open(f"http://{host}:{actual_port}")

    import uvicorn
    uvicorn.run(app, host=host, port=actual_port, log_level="warning")


@cli.command()
@click.argument("path", default=".", type=click.Path(exists=True))
@click.option("--output", "-o", default=None, help="Output JSON file for the graph.")
@click.option("--granularity", "-g", default="module",
              type=click.Choice(["module", "class", "function"]),
              help="Node granularity level.")
def analyze(path: str, output: str | None, granularity: str):
    """Analyze a codebase and output the dependency graph as JSON.

    PATH is the root directory of the codebase to analyze.
    """
    import json
    from pathlib import Path as P
    from ruth.parser.discovery import discover_files
    from ruth.graph.engine import build_graph
    from ruth.annotations.coverage import load_coverage

    project_root = P(path).resolve()

    with console.status("[dim]Analyzing codebase...[/dim]"):
        discovery = discover_files(project_root)
        graph = build_graph(discovery, project_root, granularity=granularity)
        coverage_data = load_coverage(project_root)
        if coverage_data:
            for node in graph["nodes"]:
                rel_path = node["data"]["filePath"]
                if rel_path in coverage_data:
                    node["data"]["annotations"]["coverage"] = coverage_data[rel_path]

    # Summary
    console.print()
    console.print("[bold cyan]◈ ruth[/bold cyan] analysis complete")
    console.print()
    console.print(f"  [dim]Files:[/dim]      {len(discovery.files)}")
    console.print(f"  [dim]Nodes:[/dim]      {len(graph['nodes'])}")
    console.print(f"  [dim]Edges:[/dim]      {len(graph['edges'])}")
    console.print(f"  [dim]Languages:[/dim]  {', '.join(graph['languages']) or '—'}")
    console.print()

    if output:
        with open(output, "w") as f:
            json.dump(graph, f, indent=2)
        console.print(f"  [green]✓[/green] Graph written to [bold]{output}[/bold]")
    else:
        console.print_json(json.dumps(graph, indent=2))


@cli.command()
@click.argument("path", default=".", type=click.Path(exists=True))
def scan(path: str):
    """Quick scan — show project stats without building the full graph."""
    from pathlib import Path as P
    from ruth.parser.discovery import discover_files

    project_root = P(path).resolve()

    with console.status("[dim]Scanning...[/dim]"):
        discovery = discover_files(project_root)

    console.print()
    console.print("[bold cyan]◈ ruth[/bold cyan] scan")
    console.print()

    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column(style="dim")
    table.add_column(style="bold")
    table.add_row("Project", project_root.name)
    table.add_row("Files", str(len(discovery.files)))
    table.add_row("Lines", f"{discovery.total_lines:,}")
    table.add_row("Languages", ", ".join(sorted(discovery.languages)) or "—")
    table.add_row("Directories", str(len(discovery.directories)))
    if discovery.skipped:
        table.add_row("Skipped", str(discovery.skipped))
    console.print(table)
    console.print()

    # Per-language breakdown
    lang_counts: dict[str, int] = {}
    lang_lines: dict[str, int] = {}
    for f in discovery.files:
        lang_counts[f.language] = lang_counts.get(f.language, 0) + 1
        lang_lines[f.language] = lang_lines.get(f.language, 0) + f.line_count

    if lang_counts:
        lang_table = Table(title="Language Breakdown")
        lang_table.add_column("Language", style="bold")
        lang_table.add_column("Files", justify="right")
        lang_table.add_column("Lines", justify="right")
        for lang in sorted(lang_counts, key=lambda l: lang_lines[l], reverse=True):
            lang_table.add_row(lang, str(lang_counts[lang]), f"{lang_lines[lang]:,}")
        console.print(lang_table)


if __name__ == "__main__":
    cli()
