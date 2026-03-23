import { useGraphStore } from '../store/useGraphStore';
import { Search, Flame, ShieldAlert, CheckCircle, LayoutGrid, Route } from 'lucide-react';

export function TopBar() {
  const projectName = useGraphStore((s) => s.projectName);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const activeOverlay = useGraphStore((s) => s.activeOverlay);
  const setOverlay = useGraphStore((s) => s.setOverlay);
  const connected = useGraphStore((s) => s.connected);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const setSearch = useGraphStore((s) => s.setSearch);
  const layoutDirection = useGraphStore((s) => s.layoutDirection);
  const setLayoutDirection = useGraphStore((s) => s.setLayoutDirection);
  const applyLayout = useGraphStore((s) => s.applyLayout);
  const traceMode = useGraphStore((s) => s.traceMode);
  const toggleTraceMode = useGraphStore((s) => s.toggleTraceMode);

  const handleLayoutChange = (dir: 'TB' | 'LR') => {
    setLayoutDirection(dir);
    // Re-apply layout after direction change
    setTimeout(() => applyLayout(), 0);
  };

  return (
    <header className="ruth-topbar">
      <div className="ruth-topbar__left">
        <div className="ruth-topbar__brand">
          <img src="/logo.svg" alt="Ruth" className="ruth-topbar__logo-img" />
          <span className="ruth-topbar__brand-name">Ruth</span>
        </div>
        <div className="ruth-topbar__project">
          <span className="ruth-topbar__project-name">{projectName}</span>
          <div className="ruth-topbar__connection">
            <span className={`ruth-topbar__connection-dot ${connected ? 'ruth-topbar__connection-dot--connected' : 'ruth-topbar__connection-dot--connecting'}`} />
          </div>
        </div>
      </div>

      <div className="ruth-topbar__center">
        <div className="ruth-topbar__stats">
          <div className="ruth-topbar__stat">
            <span className="ruth-topbar__stat-value">{nodes.length}</span>
            <span className="ruth-topbar__stat-label">Nodes</span>
          </div>
          <div className="ruth-topbar__stat">
            <span className="ruth-topbar__stat-value">{edges.length}</span>
            <span className="ruth-topbar__stat-label">Edges</span>
          </div>
        </div>

        <div className="ruth-topbar__search">
          <Search size={14} className="ruth-topbar__search-icon" />
          <input
            type="text"
            className="ruth-topbar__search-input"
            placeholder="Filter nodes..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="ruth-topbar__search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          ) : (
            <kbd className="ruth-topbar__search-kbd">/</kbd>
          )}
        </div>
      </div>

      <div className="ruth-topbar__right">
        {/* Overlay controls */}
        <div className="ruth-topbar__overlays">
          <label className={`ruth-overlay-btn ${activeOverlay === 'none' ? 'ruth-overlay-btn--active' : ''}`}>
            <input
              type="radio"
              name="overlay"
              checked={activeOverlay === 'none'}
              onChange={() => setOverlay('none')}
            />
            <LayoutGrid size={14} />
            Default
          </label>

          <label className={`ruth-overlay-btn ${activeOverlay === 'complexity' ? 'ruth-overlay-btn--active' : ''}`}>
            <input
              type="radio"
              name="overlay"
              checked={activeOverlay === 'complexity'}
              onChange={() => setOverlay('complexity')}
            />
            <Flame size={14} />
            Complexity
          </label>

          <label className={`ruth-overlay-btn ${activeOverlay === 'vulnerabilities' ? 'ruth-overlay-btn--active' : ''}`}>
            <input
              type="radio"
              name="overlay"
              checked={activeOverlay === 'vulnerabilities'}
              onChange={() => setOverlay('vulnerabilities')}
            />
            <ShieldAlert size={14} />
            Security
          </label>

          <label className={`ruth-overlay-btn ${activeOverlay === 'coverage' ? 'ruth-overlay-btn--active' : ''}`}>
            <input
              type="radio"
              name="overlay"
              checked={activeOverlay === 'coverage'}
              onChange={() => setOverlay('coverage')}
            />
            <CheckCircle size={14} />
            Coverage
          </label>
        </div>

        {/* Trace route (directions) */}
        <button
          className={`ruth-trace-btn ${traceMode ? 'ruth-trace-btn--active' : ''}`}
          onClick={toggleTraceMode}
          title="Trace dependency path between two nodes"
        >
          <Route size={14} />
        </button>

        {/* Layout direction toggle */}
        <div className="ruth-layout-toggle">
          <button
            className={`ruth-layout-btn ${layoutDirection === 'TB' ? 'ruth-layout-btn--active' : ''}`}
            onClick={() => handleLayoutChange('TB')}
            title="Top to Bottom"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v18M12 21l-4-4M12 21l4-4" />
            </svg>
          </button>
          <button
            className={`ruth-layout-btn ${layoutDirection === 'LR' ? 'ruth-layout-btn--active' : ''}`}
            onClick={() => handleLayoutChange('LR')}
            title="Left to Right"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M21 12l-4-4M21 12l-4 4" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
