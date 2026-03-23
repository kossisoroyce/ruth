import type { AnnotationData, OverlayMode, VulnerabilityInfo } from '../types';

// ── Complexity heatmap ────────────────────────────────────────────────

const COMPLEXITY_STOPS = [
  { threshold: 0,  color: '#10b981' },  // green
  { threshold: 20, color: '#34d399' },
  { threshold: 40, color: '#fbbf24' },  // yellow
  { threshold: 60, color: '#f97316' },  // orange
  { threshold: 80, color: '#ef4444' },  // red
  { threshold: 100, color: '#dc2626' }, // dark red
];

export function getComplexityColor(score: number | undefined): string {
  if (score == null) return 'var(--node-default)';
  const clamped = Math.max(0, Math.min(100, score));
  for (let i = COMPLEXITY_STOPS.length - 1; i >= 0; i--) {
    if (clamped >= COMPLEXITY_STOPS[i].threshold) {
      return COMPLEXITY_STOPS[i].color;
    }
  }
  return COMPLEXITY_STOPS[0].color;
}

export function getComplexityLabel(score: number | undefined): string {
  if (score == null) return '—';
  if (score < 20) return 'Low';
  if (score < 40) return 'Moderate';
  if (score < 60) return 'High';
  if (score < 80) return 'Very High';
  return 'Critical';
}

// ── Vulnerability badges ──────────────────────────────────────────────

const SEVERITY_COLORS: Record<VulnerabilityInfo['severity'], string> = {
  critical: '#dc2626',
  high:     '#ef4444',
  medium:   '#f97316',
  low:      '#fbbf24',
};

export function getVulnerabilitySeverityColor(severity: VulnerabilityInfo['severity']): string {
  return SEVERITY_COLORS[severity];
}

export function getMaxSeverity(vulns: VulnerabilityInfo[] | undefined): VulnerabilityInfo['severity'] | null {
  if (!vulns || vulns.length === 0) return null;
  const order: VulnerabilityInfo['severity'][] = ['critical', 'high', 'medium', 'low'];
  for (const s of order) {
    if (vulns.some(v => v.severity === s)) return s;
  }
  return null;
}

export function getVulnerabilityNodeColor(vulns: VulnerabilityInfo[] | undefined): string {
  const max = getMaxSeverity(vulns);
  if (!max) return 'var(--node-default)';
  return SEVERITY_COLORS[max];
}

// ── Coverage overlay ──────────────────────────────────────────────────

export function getCoverageColor(coverage: number | undefined): string {
  if (coverage == null) return 'var(--node-uncovered)';
  if (coverage >= 80) return '#10b981';
  if (coverage >= 60) return '#34d399';
  if (coverage >= 40) return '#fbbf24';
  if (coverage >= 20) return '#f97316';
  return '#ef4444';
}

export function getCoverageLabel(coverage: number | undefined): string {
  if (coverage == null) return 'No data';
  return `${Math.round(coverage)}%`;
}

// ── Unified node color by overlay ─────────────────────────────────────

export function getNodeColorByOverlay(
  overlay: OverlayMode,
  annotations: AnnotationData,
): string {
  switch (overlay) {
    case 'complexity':
      return getComplexityColor(annotations.complexity);
    case 'vulnerabilities':
      return getVulnerabilityNodeColor(annotations.vulnerabilities);
    case 'coverage':
      return getCoverageColor(annotations.coverage);
    default:
      return 'var(--node-default)';
  }
}
