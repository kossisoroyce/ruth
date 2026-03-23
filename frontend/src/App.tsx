import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TopBar } from './components/TopBar';
import { GraphCanvas } from './components/GraphCanvas';
import { CommandPalette } from './components/CommandPalette';
import { NodeHud } from './components/NodeHud';
import { useWebSocket } from './hooks/useWebSocket';

function AppInner() {
  useWebSocket();

  return (
    <div className="ruth-app">
      <TopBar />
      <div className="ruth-body">
        <GraphCanvas />
        <NodeHud />
      </div>
      <CommandPalette />
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}

export default App;
