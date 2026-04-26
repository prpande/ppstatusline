# ppstatusline — Design

**Date:** 2026-04-26
**Status:** Approved (brainstorm phase). Implementation plan not yet written.
**Audience:** the author (personal-use project).

## Overview

A custom Claude Code status line — a per-message script that consumes the JSON payload Claude Code pipes on stdin and prints a two-row status display to stdout. Replaces a previous PowerShell version that mixed responsibilities with a session-tracking system; that system has been removed.

Goals: more information than the old line, better aesthetics via emoji, explicit visibility of git context (repo, branch, worktree), and a clean, configurable Node/TypeScript codebase that could be published later if desired.

## Philosophy & constraints

- **Personal use, single machine, Windows.** Cross-platform is explicitly out of scope for v1.
- **YAGNI.** No knob, abstraction, or fallback exists in v1 unless its absence is currently causing friction.
- **Auto-hide over explicit toggle.** Segments whose data is null/absent/default in the payload simply don't render; they don't need to be turned off.
- **Fail soft.** A malformed payload, missing dependency, or bad config never produces an empty status line — the worst case is a degraded one.
- **No runtime dependencies.** Stdlib + `git`/`gh` shell-outs only. Faster startup, simpler install.

## Visual design

### Layout

Two rows, fixed.

- **Row 1 — identity:** stable across a session. Model, working directory, repo, branch, worktree, PR, reasoning state, etc.
- **Row 2 — live metrics:** changing. Context bar, cost, time, edits, rate limit.

Row 2's segment order is fixed. Row 1's segment order is config-driven.

### Reference mockups

Active session in a worktree, dirty branch ahead of upstream, open PR, high effort:
```
🤖 Opus   📁 C:\Users\pratyush.pande\src\sdx-api    mindbody/sdx   🌿 fix-auth ✱ ↑2   🌳 fix-auth   🔗 #1234   ⚡ high
📊 ████████-- 40%   💰 $0.1234   ⏱ 2.3m │ api 42s   ✏️ +156 −23   🚦 23%/5h
```
The  glyph (`U+E702`, Nerd Font `nf-dev-git`) renders in **Git brand orange** (`#F05133`).

Clean session on `main`, no worktree:
```
🤖 Sonnet   📁 C:\Users\pratyush.pande\src\my-project    me/my-project   🌿 main
📊 ---------- 0%   💰 $0.0000   ⏱ 5s   ✏️ +0 −0
```

Outside any git repo:
```
🤖 Sonnet   📁 C:\Users\pratyush.pande\Documents\notes
📊 ---------- 0%   💰 $0.0000   ⏱ 8s
```

Context near limit:
```
🤖 Opus   📁 C:\Users\pratyush.pande\src\sdx-api    mindbody/sdx   🌿 fix-auth   🌳 fix-auth
📊 █████████▓ 94%   💰 $1.2345   ⏱ 18m │ api 4.2m   ✏️ +890 −210   🚦 78%/5h
```
Bar at 94% renders red; 78%/5h rate limit renders yellow.

### Segment catalog

| Segment | Symbol | Color rule | Source |
|---|---|---|---|
| `model` | 🤖 | — | `payload.model.display_name` |
| `dir` | 📁 | — | full literal `payload.workspace.current_dir` (no `~` abbreviation) |
| `repo` |  + `<owner/name>` | glyph orange `#F05133` (truecolor) | `git remote get-url origin`, parsed to `owner/name`. Handles both HTTPS (`https://github.com/owner/name.git`) and SSH (`git@github.com:owner/name.git`) URL forms; trailing `.git` stripped. Falls back to the local folder name if origin is missing or unparseable. |
| `branch` | 🌿 + `<branch>` | — | `git rev-parse --abbrev-ref HEAD` |
| `branch state` | `✱ ↑n ↓n` | dim by default | `git status --porcelain` + `git rev-list --count`. Symbols: `✱` = uncommitted changes present; `↑n` = n commits ahead of upstream; `↓n` = n commits behind upstream. Each symbol shows only when its count is non-zero. |
| `worktree` | 🌳 + `<name>` | — | `payload.workspace.git_worktree`. **Auto-hides when not in a linked worktree.** |
| `pr` | 🔗 #`<n>` | open + checks passing → green; open + checks pending or failing → yellow; merged or closed → segment hides | `gh pr list --head <branch> --json number,url,state,statusCheckRollup --limit 1`. OSC 8 wrapped → clickable in Windows Terminal. |
| `effort` | ⚡ + `<level>` | low/medium → plain; high → yellow; xhigh/max → red | `payload.effort.level` |
| `thinking` | 💭 | — | `payload.thinking.enabled === true` |
| `sessionName` | 🏷 + `<name>` | — | `payload.session_name` (auto-hides when absent) |
| `agent` | 🤝 + `<name>` | — | `payload.agent.name` |
| `outputStyle` | 🎨 + `<name>` | — | `payload.output_style.name` (auto-hides when `default`) |
| `vimMode` | ⌨️ + `<MODE>` | — | `payload.vim.mode` |
| `context` | 📊 + bar + `<n>%` | bar fill: green <70%, yellow 70–89%, red ≥90% | `payload.context_window.used_percentage` |
| `cost` | 💰 + `$X.XXXX` | yellow | `payload.cost.total_cost_usd` |
| `time` | ⏱ + `<wall> │ api <api>` | dim labels | `payload.cost.total_duration_ms` / `total_api_duration_ms` |
| `edits` | ✏️ + `+N −N` | green / red | `payload.cost.total_lines_added` / `total_lines_removed` |
| `rateLimit` | 🚦 + `<n>%/<window>` | green/yellow/red on same 70/90 thresholds | `payload.rate_limits.five_hour.used_percentage` (+ 7d if `showSevenDayLimit`) |

### Visual rules

- **Auto-hide:** any segment whose data is null/absent/default returns `null` and does not render. Joiners between surviving segments collapse cleanly.
- **Separator:** three spaces (`   `) between segments within a row.
- **Inner separator:** ` │ ` (space, U+2502, space) inside a single segment that has multiple values (e.g., wall vs api time).
- **TTY check:** ANSI escapes are emitted only when `process.stdout.isTTY === true`. Piping the script to a file produces clean text.
- **Truecolor:** Git orange uses 24-bit ANSI (`\x1b[38;2;240;81;51m`). Windows Terminal supports it; degrades gracefully on terminals that don't.

### Symbol choices — rationale

- **Most segments use color emoji.** They render visibly distinct from text on any modern terminal, no font dependency.
- **The git glyph is the one Nerd Font holdout** — there is no Unicode emoji for the official Git logo, and `🐙`/`📦` were rejected as too generic. CaskaydiaCove Nerd Font is required.
- **Branch is `🌿`** (sprig emoji), not the NF branch glyph, for color consistency.

## Config

### Location

`~/.claude/statusline-config.json`. Single source of truth. Sits next to other Claude Code config. Missing file = built-in defaults.

### Schema

```json
{
  "row1": [
    "model",
    "dir",
    "repo",
    "branch",
    "worktree",
    "pr",
    "effort",
    "thinking",
    "sessionName",
    "agent",
    "outputStyle",
    "vimMode"
  ],
  "row2": [
    "context",
    "cost",
    "time",
    "edits",
    "rateLimit"
  ],
  "showSevenDayLimit": false,
  "prCacheTtlSeconds": 60,
  "contextBarWidth": 10,
  "iconOverrides": {}
}
```

### Customization

- **Disable a segment** → remove from `row1` / `row2`.
- **Reorder Row 1** → reorder array.
- **Show 7-day rate limit alongside 5-hour** → `"showSevenDayLimit": true`.
- **Tune PR cache** → `"prCacheTtlSeconds"` (default 60).
- **Bar width** → `"contextBarWidth"` (default 10).
- **Override an icon** → `"iconOverrides": { "repo": "📦" }`. Keys = segment names, values = any string.

### Deliberately not configurable in v1

Layout (locked: two-line). Color thresholds (locked: 70/90). Custom color values (Git orange hardcoded). Per-segment color overrides. Multi-line custom layouts. Any of these can be added if real friction emerges.

## Architecture

### Project location

`C:\src\ppstatusline\` — standalone repo, separate from `~/.claude/`. Only the compiled output is referenced from `settings.json`.

### File layout

```
C:\src\ppstatusline\
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── statusline-config.example.json
├── docs/
│   └── design/
│       └── 2026-04-26-statusline-design.md   (this file)
├── src/
│   ├── index.ts               # entrypoint
│   ├── bg-pr-refresh.ts       # SWR background worker
│   ├── config.ts              # load + merge config with defaults
│   ├── render.ts              # compose Row 1 + Row 2
│   ├── colors.ts              # ANSI helpers
│   ├── git.ts                 # git CLI wrapper
│   ├── gh.ts                  # gh CLI wrapper for PR data
│   ├── cache.ts               # SWR + disk cache
│   ├── types.ts               # shared types
│   └── segments/              # one file per segment
│       ├── model.ts
│       ├── dir.ts
│       ├── repo.ts
│       ├── branch.ts
│       ├── worktree.ts
│       ├── pr.ts
│       ├── effort.ts
│       ├── thinking.ts
│       ├── sessionName.ts
│       ├── agent.ts
│       ├── outputStyle.ts
│       ├── vimMode.ts
│       ├── context.ts
│       ├── cost.ts
│       ├── time.ts
│       ├── edits.ts
│       └── rateLimit.ts
└── dist/                       # tsc output
    ├── index.js
    └── bg-pr-refresh.js
```

### Segment contract

Every segment file exports a single renderer:

```typescript
type RenderCtx = {
  payload: ClaudePayload;
  git: GitState | null;
  pr: PrInfo | null;
  config: Config;
  c: ColorUtils;        // ANSI helpers
};

type SegmentRenderer = (ctx: RenderCtx) => string | null;
```

A renderer returns `null` to signal "hide me." `render.ts` walks `config.row1` (then `config.row2`), looks up each name in a registry, calls the renderer, drops nulls, joins survivors with three spaces.

### Data flow (per refresh)

1. `index.ts` reads stdin → `JSON.parse` → typed `ClaudePayload`.
2. In parallel:
   - `git.ts` runs git commands (or returns `null` if not in a repo).
   - `gh.ts` consults the PR cache; on miss does a synchronous shell-out, on stale returns stale + spawns background refresh.
3. `render.ts` composes Row 1 and Row 2 from the configured segment lists.
4. `index.ts` writes Row 1 + `\n` + Row 2 to stdout.

### Caching — stale-while-revalidate

Only PR data is cached. Git commands are cheap enough to run every refresh.

- **Cache file:** `~/.claude/statusline-cache/pr-<repoHash>-<branchSafe>.json`. `repoHash` is a short hash of the origin URL. `branchSafe` is the branch name with `/` replaced by `__` (so `feat/foo` → `feat__foo`) and any other non-filesystem-safe character stripped.
- **Format:** `{ value: PrInfo | null, fetchedAt: epochMs }`.
- **Read flow** (`cache.ts → getPr(repo, branch)`):
  - If cache file missing → cold fetch synchronously, write cache, return.
  - If cache fresh (now − fetchedAt < TTL) → return cached.
  - If cache stale → return cached value AND spawn detached `node dist/bg-pr-refresh.js <repoHash> <branch>` to refresh in the background.
- **Background refresh** (`bg-pr-refresh.ts`): runs the `gh` call, writes the cache atomically (write to `.tmp`, rename), exits. Spawned with `{ detached: true, stdio: 'ignore' }` and `unref()`'d so it never blocks the parent.
- **Atomic write:** prevents the main script from reading half-written JSON if it fires during a background refresh.

After the first cold fetch, every status line refresh returns in <300ms regardless of network state.

### Error handling

| Failure mode | Behavior |
|---|---|
| Bad/missing payload field | Segment returns `null` → auto-hides |
| `git` command fails or not a repo | `git` state is `null` → all git segments hide |
| `gh` not installed | PR segment hides silently |
| `gh` errors (network, auth) | PR segment hides; cache untouched |
| Bad config JSON | Warn to stderr, fall back to defaults |
| Anything else throws | Top-level catch writes a minimal `🤖 ${model}` line to stdout |

### Performance budget

| Scenario | Target |
|---|---|
| No git repo | ≤ 200 ms |
| Git repo, PR cached fresh | ≤ 300 ms |
| Git repo, PR cached stale (returns stale, refreshes in bg) | ≤ 300 ms |
| Git repo, PR cold fetch (first time only) | ≤ 700 ms |

Node cold start on Windows is ~150 ms baseline. Git calls run in parallel via `Promise.all`.

## Build & runtime

### TypeScript config

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

### Package config

`package.json`:
```json
{
  "name": "ppstatusline",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "node -e \"require('fs').rmSync('dist',{recursive:true,force:true})\""
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0"
  }
}
```

`"private": true` blocks accidental npm publish. No runtime dependencies.

### Settings.json wiring

```json
{
  "statusLine": {
    "type": "command",
    "command": "node C:/src/ppstatusline/dist/index.js"
  }
}
```

No `padding`, no `refreshInterval` — event-driven updates are sufficient.

### Setup workflow (one-time, after build)

1. `cd C:\src\ppstatusline`
2. `npm install`
3. `npm run build`
4. Add the `statusLine` block above to `~/.claude/settings.json`
5. Restart Claude Code

### Iteration workflow

1. `npm run dev` (background — recompiles on save)
2. Edit a segment in `src/segments/`
3. Status line updates next time Claude Code re-runs it

## Out of scope (YAGNI deferred)

These were explicitly considered and chose not to ship in v1. Each is a pure addition; none requires v1 changes to add later.

- Time-of-day clock (would force `refreshInterval`)
- Memory/CPU usage
- Stash count
- Conflict marker (derivable from dirty state if needed)
- Claude Code version display
- Layout switching (single-line / adaptive)
- Per-segment color overrides
- Configurable color thresholds
- Custom color hex values
- Cross-platform packaging
- npm publish / public distribution
- Powerline arrow separators
- Nerd Font glyphs for non-git segments

## References

- Official Claude Code status line documentation: https://code.claude.com/docs/en/statusline
- ccstatusline (inspiration, ideas borrowed): https://github.com/sirmalloc/ccstatusline
- Nerd Fonts (CaskaydiaCove NF used): https://www.nerdfonts.com/
- Pre-cleanup status line behavior notes: `~/.claude/statusline-notes.md`
