# Statusline — Row 1 reorder + 7-day rate limit on by default

**Date:** 2026-05-06
**Status:** Approved (brainstorm phase). Implementation plan not yet written.
**Audience:** the author (personal-use project).
**Predecessor:** [docs/design/2026-04-26-statusline-design.md](./2026-04-26-statusline-design.md)

## Goal

Two small adjustments to the default status-line configuration in code:

1. Reorder row 1 so live-metric segments appear in the order the author actually scans them.
2. Show the 7-day rate-limit bucket alongside the 5-hour bucket by default.

No new segments. No new code paths. Defaults-only change.

## Background

The 2026-04-26 design pinned row 1 as `model, context, cost, time, edits, rateLimit` and gated the 7-day rate-limit display behind `showSevenDayLimit: false`. After living with this layout, the author wants:

- The 5-hour rate-limit number adjacent to the context bar (both are "how much runway is left right now"); cost and clock further right because they're consulted less often during a working session.
- The 7-day rate-limit number visible by default — it's tracked by Anthropic and reported in the payload, and the author wants advance warning when the weekly cap is approaching, not just the 5-hour cap.

## Changes

Both changes live in `src/config.ts`, inside `DEFAULT_CONFIG`:

| Field | Before | After |
|---|---|---|
| `row1` | `['model', 'context', 'cost', 'time', 'edits', 'rateLimit']` | `['model', 'context', 'rateLimit', 'edits', 'cost', 'time']` |
| `showSevenDayLimit` | `false` | `true` |

Nothing else moves. `row2` is untouched. The icon table, color thresholds, segment renderers, types, and config schema are unchanged.

## Behavior after change

Row 1, in a session with both rate-limit fields populated:

```
🤖 Opus   📊 ████████-- 40%   🚦 23%/5h 78%/7d   ✏️ +156 −23   💰 $0.1234   ⏱ 2.3m │ api 42s
```

The existing `rateLimit` renderer (`src/segments/rateLimit.ts`) already produces both buckets as a single `🚦`-prefixed segment when `showSevenDayLimit` is true; no renderer change is needed. Each percentage colors independently using the existing 70/90 thresholds (`c.byPercent`).

Auto-hide still applies: if the payload omits one or both rate-limit fields, the segment shrinks or hides accordingly.

## Compatibility

- The user's existing `~/.claude/statusline-config.json`, if present, still wins over the new defaults — `loadConfig()` overlays it on top of `DEFAULT_CONFIG` field by field.
- A user who previously relied on `showSevenDayLimit: false` being the default is unaffected — they can set it to `false` explicitly, but for this single-author repo that's not a concern.

## Out of scope (deferred again)

- A separate weekly-spend tracker reconstructed from local cost logs (option C from the brainstorm). Adds storage, rotation, and rollup logic; revisit only if Anthropic's `seven_day` data turns out to be insufficient signal.
- Distinct icon for the 7-day bucket. Same `🚦` glyph remains; the `/5h` vs `/7d` suffix already disambiguates.
- Promoting any row 1 / row 2 ordering to a runtime knob beyond the existing config file.

## Acceptance

- After `npm run build`, the compiled `dist/index.js`, when fed a payload that includes both `rate_limits.five_hour.used_percentage` and `rate_limits.seven_day.used_percentage`, prints row 1 with segments in the new order and both percentages inside the rate-limit segment.
- A user with no `statusline-config.json` sees the new layout immediately on the next Claude Code refresh.
- A user with a config file that pins `row1` or `showSevenDayLimit` continues to see exactly what their config specifies.
