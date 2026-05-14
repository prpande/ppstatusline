---
date: 2026-05-14
status: Approved (brainstorm phase). Implementation plan not yet written.
audience: the author (personal-use project).
---

# ppstatusline — Width Detection Fix — Design

## Problem

The status line ellipsizes content even when the terminal has plenty of unused horizontal space. On a 200-column terminal, the line still truncates somewhere around column 119.

## Root cause

`detectColumns()` in `src/index.ts` probes `process.stderr/stdout/stdin.columns`, then `COLUMNS` env, then falls back to **120**.

When Claude Code spawns the status line script, it pipes the JSON payload to stdin and captures stdout. None of the three standard streams is a TTY at that point, so `.columns` is `undefined` on all of them. `COLUMNS` is not exported by Claude Code. The probe therefore falls through to the hardcoded **120** on every invocation, regardless of how wide the actual terminal is.

`src/index.ts:66` then reserves `-1` for host padding, so the effective truncation budget is **119 cells** per row even on a much wider terminal.

## Goals

- Detect the parent terminal's true width dynamically, so the status line uses all of it.
- Adapt across resizes between invocations — Claude Code re-runs the script per message.
- Keep the existing perf budget (≤ 200 ms with no git repo, ≤ 300 ms with PR cache fresh).
- Preserve existing fallback behavior when no terminal is reachable (e.g., CI).

## Non-goals

- No changes to `cellWidth()`, `findTruncationCut()`, or `truncateToWidth()` — those are already correct.
- No changes to the two-row layout, segment registry, or config schema.
- No cross-process caching of width.
- No new runtime dependencies.

## Approach

Add a new probe step that opens the parent console directly, regardless of how stdio is wired:

- **Windows**: `openSync('CONOUT$', 'r+')`
- **POSIX**: `openSync('/dev/tty', 'r+')`

Wrap the resulting fd in `new tty.WriteStream(fd)` and read `.columns`. This works *even when stdio is redirected* — it talks to the actual controlling terminal of the process. Both APIs are Node stdlib.

This probe becomes the first step in `detectColumns()`. The existing stream / env / default chain is preserved as fallback for unusual environments.

## Architecture

Extract terminal probing into a new file `src/terminal.ts`, matching the existing pattern (`git.ts`, `gh.ts`, `colors.ts`).

`src/terminal.ts` exports a single function:

```ts
export function detectColumns(): number;
```

`src/index.ts` imports it and replaces the in-file `detectColumns()`. No other changes to `index.ts`.

### Probe chain (in order)

1. **Parent-console probe** (new, primary).
   - Open `CONOUT$` (Windows) or `/dev/tty` (POSIX).
   - Wrap fd in `tty.WriteStream(fd)`.
   - Read `.columns`. Close fd.
   - Return value if it is a finite positive number; otherwise treat as miss.
2. **Stream probe** (existing). `process.stderr.columns`, then `process.stdout.columns`, then `process.stdin.columns`.
3. **Env var**. `process.env.COLUMNS`, parsed as a positive integer.
4. **Default**. `120`.

Each step is wrapped in `try/catch`. Any thrown error is silent and falls through to the next step.

### Slack cell

`index.ts:66` keeps the existing `-1` slack:

```ts
const cols = Math.max(1, detectColumns() - 1);
```

Rationale: 1 cell is below visual perceptibility, and the slack still guards against any host-side padding we can't observe. The fix is about getting the *base* width right; once that's correct, the slack is harmless.

## Error handling

| Failure | Behavior |
|---|---|
| `CONOUT$` / `/dev/tty` doesn't exist (no controlling terminal, e.g. CI) | Probe returns null, falls through to stream probe |
| `tty.WriteStream(fd)` throws | Caught, returns null, falls through |
| `columns` is `undefined`, `0`, or not finite | Treated as miss, falls through |
| All four probes return nothing | Returns `120` (unchanged from today) |

No new failure surfaces in the rendered status line.

## Performance

Opening `CONOUT$` / `/dev/tty` is a single syscall. Constructing `tty.WriteStream` is cheap (no I/O). The total cost is sub-millisecond — negligible against the 200–300 ms budget. The fd is closed before the probe returns; no leak.

## Testing

Manual smoke tests only — the project has no test infrastructure today, and this fix is small enough that introducing one is over-investment.

1. Run `echo '{...}' | node dist/index.js` from PowerShell windows of three widths (80, 140, 200 cols). Confirm the rendered row visibly uses the available width on each, and that the 80-col case still truncates correctly with the ellipsis.
2. Resize the terminal between two invocations. Confirm the second invocation reflects the new width.
3. Run from a non-terminal context (e.g., piping output through `more` or invoking from a script with no controlling terminal) and confirm graceful fallback to 120 without errors.

## File-level changes

- **New**: `src/terminal.ts` (probe-chain implementation).
- **Modified**: `src/index.ts` — delete in-file `detectColumns()`, import from `./terminal.js`.
- **Unchanged**: `package.json` — no test runner is being introduced.

## Out of scope

- Recomputing width mid-render (the script lives ms; one probe per invocation is enough).
- Caching width across script invocations (Claude Code re-spawns per message; cost is already sub-ms).
- Removing the `-1` slack (revisit later if a real over-conservatism case shows up).
- A `columns` config override (YAGNI — probe is reliable enough).

## References

- `src/index.ts:19-27` — current `detectColumns()`.
- `src/index.ts:66` — slack reservation site.
- `src/render.ts:103-113` — `truncateToWidth()` and ellipsis logic (unchanged).
- Node docs: `tty.WriteStream` accepts an arbitrary fd; well-suited for non-stdio TTYs.
- `2026-04-26-statusline-design.md` — the original design this fix slots into.
