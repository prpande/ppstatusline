import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Config, Icons } from './types.js';

const DEFAULT_CONFIG: Config = {
  row1: [
    'model',
    'dir',
    'repo',
    'branch',
    'worktree',
    'pr',
    'effort',
    'thinking',
    'sessionName',
    'agent',
    'outputStyle',
    'vimMode',
  ],
  row2: ['context', 'cost', 'time', 'edits', 'rateLimit'],
  showSevenDayLimit: false,
  prCacheTtlSeconds: 60,
  contextBarWidth: 10,
  iconOverrides: {},
};

export const DEFAULT_ICONS: Icons = {
  model: '🤖',
  dir: '📁',
  repo: '',           // Nerd Font: nf-dev-git
  branch: '🌿',
  worktree: '🌳',
  pr: '🔗',
  effort: '⚡',
  thinking: '💭',
  sessionName: '🏷',
  agent: '🤝',
  outputStyle: '🎨',
  vimMode: '⌨️',
  context: '📊',
  cost: '💰',
  time: '⏱',
  edits: '✏️',
  rateLimit: '🚦',
};

export function loadConfig(): Config {
  const path = join(homedir(), '.claude', 'statusline-config.json');
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      iconOverrides: { ...DEFAULT_CONFIG.iconOverrides, ...(parsed.iconOverrides ?? {}) },
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') {
      // Bad JSON or unreadable file — warn but don't crash.
      process.stderr.write(`[ppstatusline] config load failed (${String(err)}); using defaults\n`);
    }
    return DEFAULT_CONFIG;
  }
}

export function resolveIcons(config: Config): Icons {
  return { ...DEFAULT_ICONS, ...config.iconOverrides };
}
