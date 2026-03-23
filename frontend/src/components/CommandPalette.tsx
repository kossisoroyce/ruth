import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../store/useGraphStore';
import { FileCode, FileType, Code2, Folder, Search } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const { setCenter } = useReactFlow();

  // Toggle the menu when Cmd+K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (nodeId: string) => {
    selectNode(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 110, node.position.y + 40, { duration: 400, zoom: 1.2 });
    }
    setOpen(false);
  };

  if (!open) return null;

  const modules = nodes.filter(n => n.type === 'module');
  const classes = nodes.filter(n => n.type === 'class');
  const functions = nodes.filter(n => n.type === 'function');
  const directories = nodes.filter(n => n.type === 'directory');

  return (
    <div className="ruth-cmd-overlay" onClick={() => setOpen(false)}>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className="ruth-cmd-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ruth-cmd-input-wrapper">
          <Search className="ruth-cmd-search-icon" size={16} />
          <Command.Input
            placeholder="Search nodes..."
            className="ruth-cmd-input"
            autoFocus
          />
        </div>
        <Command.List className="ruth-cmd-list">
          <Command.Empty className="ruth-cmd-empty">No results found.</Command.Empty>

          {modules.length > 0 && (
            <Command.Group heading="Modules">
              {modules.map((node) => (
                <Command.Item
                  key={node.id}
                  value={`${node.data.label} ${node.data.filePath}`}
                  onSelect={() => handleSelect(node.id)}
                  className="ruth-cmd-item"
                >
                  <FileCode size={16} className="ruth-cmd-item-icon" />
                  <span className="ruth-cmd-item-label">{node.data.label}</span>
                  <span className="ruth-cmd-item-path">{node.data.filePath}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {classes.length > 0 && (
            <Command.Group heading="Classes">
              {classes.map((node) => (
                <Command.Item
                  key={node.id}
                  value={`${node.data.label} ${node.data.filePath}`}
                  onSelect={() => handleSelect(node.id)}
                  className="ruth-cmd-item"
                >
                  <FileType size={16} className="ruth-cmd-item-icon" />
                  <span className="ruth-cmd-item-label">{node.data.label}</span>
                  <span className="ruth-cmd-item-path">{node.data.filePath}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {functions.length > 0 && (
            <Command.Group heading="Functions">
              {functions.map((node) => (
                <Command.Item
                  key={node.id}
                  value={`${node.data.label} ${node.data.filePath}`}
                  onSelect={() => handleSelect(node.id)}
                  className="ruth-cmd-item"
                >
                  <Code2 size={16} className="ruth-cmd-item-icon" />
                  <span className="ruth-cmd-item-label">{node.data.label}</span>
                  <span className="ruth-cmd-item-path">{node.data.filePath}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {directories.length > 0 && (
            <Command.Group heading="Directories">
              {directories.map((node) => (
                <Command.Item
                  key={node.id}
                  value={`${node.data.label} ${node.data.filePath}`}
                  onSelect={() => handleSelect(node.id)}
                  className="ruth-cmd-item"
                >
                  <Folder size={16} className="ruth-cmd-item-icon" />
                  <span className="ruth-cmd-item-label">{node.data.label}</span>
                  <span className="ruth-cmd-item-path">{node.data.filePath}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </div>
  );
}
