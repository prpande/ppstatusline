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

function pickStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : fallback;
}

function pickPositiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pickIconOverrides(value: unknown): Partial<Icons> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Partial<Icons> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') (out as Record<string, string>)[k] = v;
  }
  return out;
}

export function loadConfig(): Config {
  const path = join(homedir(), '.claude', 'statusline-config.json');
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      row1: pickStringArray(parsed.row1, DEFAULT_CONFIG.row1),
      row2: pickStringArray(parsed.row2, DEFAULT_CONFIG.row2),
      showSevenDayLimit: pickBool(parsed.showSevenDayLimit, DEFAULT_CONFIG.showSevenDayLimit),
      prCacheTtlSeconds: pickPositiveInt(parsed.prCacheTtlSeconds, DEFAULT_CONFIG.prCacheTtlSeconds),
      contextBarWidth: pickPositiveInt(parsed.contextBarWidth, DEFAULT_CONFIG.contextBarWidth),
      iconOverrides: { ...DEFAULT_CONFIG.iconOverrides, ...pickIconOverrides(parsed.iconOverrides) },
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
