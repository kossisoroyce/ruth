import type { NodeKind, Language } from '../types';

// SVG path data for inline icons (no icon library dependency)

export const KIND_ICONS: Record<NodeKind, string> = {
  module:    'M3 3h18v18H3V3zm2 2v14h14V5H5z M7 9h10 M7 12h10 M7 15h6',
  class:     'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  function:  'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4m-12 6H5a2 2 0 01-2-2v-4',
  directory: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
};

export const LANGUAGE_COLORS: Record<Language, string> = {
  python:     '#e4e4e7',
  typescript: '#d4d4d8',
  javascript: '#a1a1aa',
  rust:       '#71717a',
  go:         '#e4e4e7',
  java:       '#d4d4d8',
  ruby:       '#a1a1aa',
  c:          '#71717a',
  cpp:        '#e4e4e7',
  unknown:    '#d4d4d8',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  python:     'PY',
  typescript: 'TS',
  javascript: 'JS',
  rust:       'RS',
  go:         'GO',
  java:       'JV',
  ruby:       'RB',
  c:          'C',
  cpp:        'C++',
  unknown:    '??',
};
