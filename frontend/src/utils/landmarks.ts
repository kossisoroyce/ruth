import type { NodeRole } from '../types';

export interface RoleInfo {
  label: string;
  color: string;
  icon: string; // SVG path
  description: string;
}

export const ROLE_CONFIG: Record<NodeRole, RoleInfo> = {
  entrypoint: {
    label: 'Entry Point',
    color: '#22c55e',
    icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10',
    description: 'Where execution begins — main files, CLI entry points',
  },
  orchestrator: {
    label: 'Orchestrator',
    color: '#a78bfa',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    description: 'Wires the app together — imports many modules',
  },
  hub: {
    label: 'Hub',
    color: '#f59e0b',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v8M8 12h8',
    description: 'Core dependency — imported by many files',
  },
  config: {
    label: 'Config',
    color: '#64748b',
    icon: 'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z',
    description: 'Settings and configuration files',
  },
  island: {
    label: 'Island',
    color: '#6b7280',
    icon: 'M18 6L6 18M6 6l12 12',
    description: 'No connections — potentially dead code',
  },
};
