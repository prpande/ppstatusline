---
date: 2026-05-15
status: Shipped.
audience: the author (personal-use project).
---

# ppstatusline — Width Detection Fix — Design

## Problem

The status line ellipsizes content even when the terminal has plenty of unused horizontal space. On a wide terminal, the line truncates somewhere around column 119.

## Initial diagnosis

`detectColumns()` in `src/index.ts` probed `process.stderr/stdout/stdin.columns`, then `COLUMNS` env, then fell back to **120**. In Claude Code, those streams are pipes (no `.columns`), `COLUMNS` is unset, so we always fell through to 120.

## What we tried first

Added a primary probe that opens the parent console directly — `\\.\CONOUT$` on Windows, `/dev/tty` on POSIX, wrapped in `tty.WriteStream` to read `.columns`.

That works in plain PowerShell (returns the real window width). **It does not work inside Claude Code:**

```
probeParentConsole: opened \\.\CONOUT$ fd=3 cols=120 rows=30 isTTY=true
detectColumns -> 120
```

Claude Code spawns the status-line script inside a fixed **120 × 30 ConPTY**. Our probe correctly reads that ConPTY's size — but that's not the rendering width. Claude Code renders our captured stdout into a wider area on the outer terminal.

We confirmed via diagnostic logging that Claude Code exposes the actual outer width through **no channel** we can read:

- Not via the stdin payload (no `columns` / `width` / equivalent field).
- Not via env vars (`COLUMNS` / `LINES` / `WT_*` — none carry size).
- Not via the ConPTY (it's fixed at 120 × 30).

The only env vars Claude Code passes are `CLAUDE_CODE_*`, `CLAUDE_EFFORT`, `CLAUDE_PROJECT_DIR`, `TERM=xterm-256color`, `WT_PROFILE_ID`, `WT_SESSION` — none of which expose dimensions.

## What actually shipped

Stop truncating in the script. Claude Code clips our output to the outer terminal width on its side and renders cleanly across the available area. The original design's concern — "a row that wraps eats the next row's slot" — turned out to be obsolete in current Claude Code. Verified: when the outer terminal is narrow, Claude Code adds the ellipsis itself; when it's wide, the full row renders.

### Code change

```ts
// Before
const cols = Math.max(1, detectColumns() - 1);
const row1 = renderRow(config.row1, ctx, cols);
const row2 = renderRow(config.row2, ctx, cols);

// After
const row1 = renderRow(config.row1, ctx);
const row2 = renderRow(config.row2, ctx);
```

`renderRow`'s `maxWidth` argument is already optional; passing nothing skips truncation. `detectColumns` and its host file (`src/terminal.ts`, briefly introduced during the CONOUT$ probe attempt) are deleted. `truncateToWidth` / `findTruncationCut` / `cellWidth` in `render.ts` are kept — `renderRow` will still call them if any future caller passes a width — but they are otherwise unreachable from the main flow.

## Testing

Manual smoke test inside an active Claude Code session:

1. Wide terminal: row 2 renders to its full content with no premature ellipsis.
2. Narrow terminal: Claude Code adds its own ellipsis at the right edge.
3. Both rows remain distinct; no row eats the other's slot.

## Out of scope

- Any future need to know the real terminal width (e.g., for ANSI cursor positioning) would require Claude Code to expose it. Filing this as something to watch for in future Claude Code releases.
- A configurable column override is not added — YAGNI, since we no longer truncate.

## References

- `src/index.ts` — the change site.
- `src/render.ts:115` — `renderRow` signature with optional `maxWidth`.
- `2026-04-26-statusline-design.md` — original design; this fix supersedes its "Truncate to terminal width" guidance.
