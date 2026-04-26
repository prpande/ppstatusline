# ppstatusline

Custom [Claude Code](https://claude.com/claude-code) status line. Two rows: identity on top, live metrics on bottom.

```
🤖 Opus   📁 C:\src\my-project    me/my-project   🌿 main   🌳 fix-auth   🔗 #1234   ⚡ high
📊 ████------ 40%   💰 $0.1234   ⏱ 2.3m │ api 42s   ✏️ +156 −23   🚦 23%/5h
```

Personal-use project. See `docs/design/2026-04-26-statusline-design.md` for the full spec.

## Requirements

- Node 20+ (built and tested on 24)
- Git for Windows (`git` on PATH)
- GitHub CLI (`gh` on PATH, authenticated) — only needed for the PR segment; otherwise it just hides
- A Nerd Font installed and configured in your terminal (e.g. `CaskaydiaCove Nerd Font`) — only required for the orange git glyph in the repo segment; everything else is plain emoji

## Setup

```bash
cd C:\src\ppstatusline
npm install
npm run build
```

Then add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node C:/src/ppstatusline/dist/index.js"
  }
}
```

Restart Claude Code.

## Customizing

Defaults work without any config. To customize, create `~/.claude/statusline-config.json` — see `statusline-config.example.json` for the full schema with defaults.

Common tweaks:

```json
{
  "row1": ["model", "dir", "repo", "branch", "worktree", "pr", "effort"],
  "showSevenDayLimit": true,
  "contextBarWidth": 20,
  "iconOverrides": { "branch": "🌱" }
}
```

## Iterating

```bash
npm run dev   # tsc --watch in the background
```

Edit a segment in `src/segments/`. The status line updates next time Claude Code re-runs it (next assistant message).

## Manually testing the script

Pipe a Claude Code payload (real or synthetic) at `dist/index.js`:

```bash
echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"C:\\\\src\\\\ppstatusline"}}' | node dist/index.js
```

For a more representative payload schema, see the `Available data` section of the [official docs](https://code.claude.com/docs/en/statusline).

## Acknowledgements

Inspiration drawn from [ccstatusline](https://github.com/sirmalloc/ccstatusline). Different scope (single-user opinionated build vs. ccstatusline's full TUI-configured framework), but several patterns — segment composition, git worktree handling, threshold-colored bars — were borrowed.
