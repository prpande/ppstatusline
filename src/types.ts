// Shared types for the status line.

export type ClaudePayload = {
  cwd?: string;
  session_id?: string;
  session_name?: string;
  transcript_path?: string;
  version?: string;
  model: { id?: string; display_name: string };
  workspace: {
    current_dir: string;
    project_dir?: string;
    added_dirs?: string[];
    git_worktree?: string;
  };
  output_style?: { name: string };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number | null;
    remaining_percentage?: number | null;
    current_usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
  };
  exceeds_200k_tokens?: boolean;
  effort?: { level: 'low' | 'medium' | 'high' | 'xhigh' | 'max' };
  thinking?: { enabled: boolean };
  rate_limits?: {
    five_hour?: { used_percentage: number; resets_at: number };
    seven_day?: { used_percentage: number; resets_at: number };
  };
  vim?: { mode: 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' };
  agent?: { name: string };
  worktree?: {
    name: string;
    path: string;
    branch?: string;
    original_cwd?: string;
    original_branch?: string;
  };
};

export type GitState = {
  branch: string;
  repo: string | null;       // owner/name parsed from origin, or null if unparseable
  originUrl: string | null;  // raw origin URL, used as cache key for PR data
  ahead: number;
  behind: number;
  dirty: boolean;
};

export type PrState = 'OPEN_PASSING' | 'OPEN_PENDING_OR_FAILING' | 'CLOSED_OR_MERGED';

export type PrInfo = {
  number: number;
  url: string;
  state: PrState;
};

export type Config = {
  row1: string[];
  row2: string[];
  showSevenDayLimit: boolean;
  prCacheTtlSeconds: number;
  contextBarWidth: number;
  iconOverrides: Record<string, string>;
};

export type ColorUtils = {
  enabled: boolean;             // false when stdout is not a TTY
  reset: string;
  dim: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  red: (s: string) => string;
  gitOrange: (s: string) => string;
  byPercent: (pct: number, s: string) => string;     // <70 green, 70-89 yellow, >=90 red
  link: (text: string, url: string) => string;       // OSC 8 hyperlink (no-op if disabled)
};

export type Icons = {
  model: string;
  dir: string;
  repo: string;
  branch: string;
  worktree: string;
  pr: string;
  effort: string;
  thinking: string;
  sessionName: string;
  agent: string;
  outputStyle: string;
  vimMode: string;
  context: string;
  cost: string;
  time: string;
  edits: string;
  rateLimit: string;
};

export type RenderCtx = {
  payload: ClaudePayload;
  git: GitState | null;
  pr: PrInfo | null;
  config: Config;
  c: ColorUtils;
  icons: Icons;   // resolved (defaults + overrides)
};

export type SegmentRenderer = (ctx: RenderCtx) => string | null;
