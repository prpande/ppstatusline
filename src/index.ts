import { loadConfig, resolveIcons } from './config.js';
import { makeColors } from './colors.js';
import { collectGitState } from './git.js';
import { getOrRefreshPr } from './cache.js';
import { renderRow } from './render.js';
import type { ClaudePayload, RenderCtx } from './types.js';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let payload: ClaudePayload;
  try {
    payload = JSON.parse(raw) as ClaudePayload;
  } catch {
    // Empty/malformed stdin → emit a tiny degraded line so the bar isn't blank.
    process.stdout.write('🤖\n');
    return;
  }

  const config = loadConfig();
  const icons = resolveIcons(config);
  // Always emit ANSI: Claude Code captures stdout (so isTTY is false) but
  // expects and forwards escape codes to the user's terminal. Honor NO_COLOR
  // for the universal opt-out.
  const c = makeColors(process.env.NO_COLOR === undefined);

  const cwd = payload.workspace?.current_dir ?? payload.cwd ?? process.cwd();

  // Fetch git state. If we're in a repo with a known origin, fetch PR data in parallel.
  const git = await collectGitState(cwd);
  const pr =
    git && git.originUrl && git.branch
      ? await getOrRefreshPr({
          cwd,
          branch: git.branch,
          originUrl: git.originUrl,
          ttlSeconds: config.prCacheTtlSeconds,
        })
      : null;

  const ctx: RenderCtx = { payload, git, pr, config, c, icons };

  // No truncation: Claude Code spawns us in a fixed 120-col ConPTY but
  // renders our output into its own (wider) display area on the outer
  // terminal, clipping cleanly at its right edge. Truncating here just
  // creates premature ellipses.
  const row1 = renderRow(config.row1, ctx);
  const row2 = renderRow(config.row2, ctx);

  process.stdout.write(`${row1}\n${row2}\n`);
}

main().catch((err) => {
  // Last-resort fallback: never produce a blank status line.
  process.stderr.write(`[ppstatusline] fatal: ${String(err)}\n`);
  process.stdout.write('🤖\n');
});
