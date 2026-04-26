import type { RenderCtx, SegmentRenderer } from './types.js';

import { agent } from './segments/agent.js';
import { branch } from './segments/branch.js';
import { context } from './segments/context.js';
import { cost } from './segments/cost.js';
import { dir } from './segments/dir.js';
import { edits } from './segments/edits.js';
import { effort } from './segments/effort.js';
import { model } from './segments/model.js';
import { outputStyle } from './segments/outputStyle.js';
import { pr } from './segments/pr.js';
import { rateLimit } from './segments/rateLimit.js';
import { repo } from './segments/repo.js';
import { sessionName } from './segments/sessionName.js';
import { thinking } from './segments/thinking.js';
import { time } from './segments/time.js';
import { vimMode } from './segments/vimMode.js';
import { worktree } from './segments/worktree.js';

const REGISTRY: Record<string, SegmentRenderer> = {
  agent,
  branch,
  context,
  cost,
  dir,
  edits,
  effort,
  model,
  outputStyle,
  pr,
  rateLimit,
  repo,
  sessionName,
  thinking,
  time,
  vimMode,
  worktree,
};

const SEPARATOR = '   ';

export function renderRow(names: string[], ctx: RenderCtx): string {
  const parts: string[] = [];
  for (const name of names) {
    const renderer = REGISTRY[name];
    if (!renderer) continue;
    const out = renderer(ctx);
    if (out !== null && out !== '') parts.push(out);
  }
  return parts.join(SEPARATOR);
}
