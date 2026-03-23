import { useGraphStore } from '../store/useGraphStore';
import type { ModuleNodeData, ClassNodeData, FunctionNodeData } from '../types';
import { ROLE_CONFIG } from '../utils/landmarks';
import {
  X, ShieldAlert, Cpu, Layers, Link, GitMerge, FileCode, CheckCircle, Flame,
  ArrowDownRight, ArrowUpRight, MapPin,
} from 'lucide-react';

export function NodeHud() {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);

  if (!selectedId) return null;

  const node = nodes.find((n) => n.id === selectedId);
  if (!node) return null;

  const data = node.data;
  const ann = data.annotations;
  const roles = data.roles || [];

  return (
    <div className="ruth-hud">
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
          <Link size={14} className="ruth-hud-icon" />
          {data.filePath}
        </div>

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
              <div className="ruth-hud-stat"><Link size={14}/><span>{(data as ModuleNodeData).importCount} Imports</span></div>
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

        {/* Connectivity (Google Maps-like traffic info) */}
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
