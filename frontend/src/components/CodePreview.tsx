import { useGraphStore } from '../store/useGraphStore';
import { X, Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

export function CodePreview() {
  const previewNodeId = useGraphStore((s) => s.previewNodeId);
  const previewCode = useGraphStore((s) => s.previewCode);
  const previewLoading = useGraphStore((s) => s.previewLoading);
  const nodes = useGraphStore((s) => s.nodes);
  const closePreview = useGraphStore((s) => s.closePreview);
  const [copied, setCopied] = useState(false);

  if (!previewNodeId) return null;

  const node = nodes.find((n) => n.id === previewNodeId);
  if (!node) return null;

  const lines = previewCode?.split('\n') ?? [];

  const handleCopy = useCallback(() => {
    if (previewCode) {
      navigator.clipboard.writeText(previewCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [previewCode]);

  return (
    <div className="ruth-preview-overlay" onClick={closePreview}>
      <div className="ruth-preview" onClick={(e) => e.stopPropagation()}>
        <div className="ruth-preview-header">
          <div className="ruth-preview-file">
            <span className="ruth-preview-filename">{node.data.label}</span>
            <span className="ruth-preview-path">{node.data.filePath}</span>
          </div>
          <div className="ruth-preview-actions">
            <button className="ruth-preview-btn" onClick={handleCopy} title="Copy code">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="ruth-preview-btn" onClick={closePreview} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="ruth-preview-code">
          {previewLoading ? (
            <div className="ruth-preview-loading">
              <div className="ruth-canvas__empty-spinner" />
              <span>Loading...</span>
            </div>
          ) : (
            <pre>
              <code>
                {lines.map((line, i) => (
                  <div key={i} className="ruth-preview-line">
                    <span className="ruth-preview-linenum">{i + 1}</span>
                    <span className="ruth-preview-linetext">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
