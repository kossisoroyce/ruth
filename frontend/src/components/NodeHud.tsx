import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { ModuleNodeData, ClassNodeData, FunctionNodeData } from '../types';
import { ROLE_CONFIG } from '../utils/landmarks';
import {
  X, ShieldAlert, Cpu, Layers, GitMerge, FileCode, CheckCircle, Flame,
  ArrowDownRight, ArrowUpRight, MapPin, Eye, Copy, Check, ChevronDown,
} from 'lucide-react';

export function NodeHud() {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset code panel when selecting a different node
  useEffect(() => {
    setCodeOpen(false);
    setCode(null);
  }, [selectedId]);

  const node = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  const loadCode = useCallback(async (filePath: string) => {
    if (codeOpen) {
      setCodeOpen(false);
      return;
    }
    setCodeOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error();
      setCode(await res.text());
    } catch {
      setCode('// Could not load file');
    }
    setLoading(false);
  }, [codeOpen]);

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  if (!node) return null;

  const data = node.data;
  const ann = data.annotations;
  const roles = data.roles || [];
  const lines = code?.split('\n') ?? [];

  return (
    <div className={`ruth-hud ${codeOpen ? 'ruth-hud--code-open' : ''}`}>
      <div className="ruth-hud-header">
        <div>
          <span className="ruth-hud-kind">{data.kind.toUpperCase()}</span>
          <h3 className="ruth-hud-title">{data.label}</h3>
        </div>
        <button className="ruth-hud-close" onClick={() => selectNode(null)}>
          <X size={16} />
        </button>
      </div>

      <div className="ruth-hud-body">
        <div className="ruth-hud-path">
          <FileCode size={14} className="ruth-hud-icon" />
          {data.filePath}
        </div>

        <button
          type="button"
          className="ruth-hud-preview-btn"
          onClick={() => loadCode(data.filePath)}
        >
          <Eye size={14} />
          {codeOpen ? 'Hide Code' : 'View Code'}
          <ChevronDown size={14} style={{ marginLeft: 'auto', transform: codeOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
        </button>

        {/* Inline code preview */}
        {codeOpen && (
          <div className="ruth-hud-code">
            <div className="ruth-hud-code-toolbar">
              <span className="ruth-hud-code-label">{data.filePath}</span>
              <button type="button" className="ruth-hud-code-copy" onClick={handleCopy} title="Copy code">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="ruth-hud-code-scroll">
              {loading ? (
                <div className="ruth-hud-code-loading">Loading...</div>
              ) : (
                <pre><code>{lines.map((line, i) => (
                  <div key={i} className="ruth-hud-code-line">
                    <span className="ruth-hud-code-num">{i + 1}</span>
                    <span className="ruth-hud-code-text">{line}</span>
                  </div>
                ))}</code></pre>
              )}
            </div>
          </div>
        )}

        {/* Landmark roles */}
        {roles.length > 0 && (
          <div className="ruth-hud-roles">
            {roles.map(role => {
              const info = ROLE_CONFIG[role];
              return (
                <div key={role} className="ruth-hud-role" style={{ borderColor: `${info.color}33`, background: `${info.color}11` }}>
                  <MapPin size={12} style={{ color: info.color }} />
                  <div>
                    <span className="ruth-hud-role-label" style={{ color: info.color }}>{info.label}</span>
                    <span className="ruth-hud-role-desc">{info.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="ruth-hud-stats">
          {data.kind === 'module' && (
            <>
              <div className="ruth-hud-stat"><GitMerge size={14}/><span>{(data as ModuleNodeData).exportCount} Exports</span></div>
              <div className="ruth-hud-stat"><FileCode size={14}/><span>{(data as ModuleNodeData).importCount} Imports</span></div>
              <div className="ruth-hud-stat"><FileCode size={14}/><span>{(data as ModuleNodeData).lineCount} Lines</span></div>
            </>
          )}
          {data.kind === 'class' && (
            <>
              <div className="ruth-hud-stat"><Cpu size={14}/><span>{(data as ClassNodeData).methodCount} Methods</span></div>
              <div className="ruth-hud-stat"><Layers size={14}/><span>{(data as ClassNodeData).propertyCount} Props</span></div>
            </>
          )}
          {data.kind === 'function' && (
            <>
              <div className="ruth-hud-stat"><FileCode size={14}/><span>{(data as FunctionNodeData).params.length} Params</span></div>
              {(data as FunctionNodeData).returnType && (
                <div className="ruth-hud-stat"><span>→ {(data as FunctionNodeData).returnType}</span></div>
              )}
            </>
          )}
        </div>

        {/* Connectivity */}
        {(data.inDegree != null || data.outDegree != null) && (
          <div className="ruth-hud-connectivity">
            <h4 className="ruth-hud-subtitle">CONNECTIVITY</h4>
            <div className="ruth-hud-stats">
              <div className="ruth-hud-stat"><ArrowDownRight size={14}/><span>{data.inDegree ?? 0} Dependents</span></div>
              <div className="ruth-hud-stat"><ArrowUpRight size={14}/><span>{data.outDegree ?? 0} Dependencies</span></div>
            </div>
          </div>
        )}

        {/* Annotations */}
        {(ann.complexity != null || ann.coverage != null || (ann.vulnerabilities && ann.vulnerabilities.length > 0)) && (
          <div className="ruth-hud-annotations">
            <h4 className="ruth-hud-subtitle">METRICS</h4>

            {ann.complexity != null && (
              <div className="ruth-hud-metric">
                <div className="ruth-hud-metric-label"><Flame size={14}/> Complexity</div>
                <div className="ruth-hud-metric-val">{ann.complexity}/100</div>
              </div>
            )}

            {ann.coverage != null && (
              <div className="ruth-hud-metric">
                <div className="ruth-hud-metric-label"><CheckCircle size={14}/> Coverage</div>
                <div className="ruth-hud-metric-val">{ann.coverage}%</div>
              </div>
            )}
          </div>
        )}

        {ann.vulnerabilities && ann.vulnerabilities.length > 0 && (
          <div className="ruth-hud-vulns">
            <h4 className="ruth-hud-subtitle ruth-hud-vuln-title"><ShieldAlert size={14}/> VULNERABILITIES</h4>
            {ann.vulnerabilities.map(v => (
              <div key={v.id} className="ruth-hud-vuln-item">
                <span className={`ruth-hud-vuln-badge ruth-hud-vuln-badge-${v.severity}`}>{v.severity.toUpperCase()}</span>
                <span className="ruth-hud-vuln-name">{v.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
