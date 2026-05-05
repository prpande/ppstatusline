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
const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const ELLIPSIS = '…';

// Width of a single Unicode codepoint in terminal cells. Approximate, but
// errs on the side of overcounting so we never under-truncate and let a row
// wrap onto a second physical line (which Claude Code would treat as our
// row 2 slot — see the bug fixed by this truncation pass).
function cellWidth(cp: number): number {
  // Combining marks / variation selectors / ZWJ — render as 0 cells.
  if (cp === 0xfe0f || cp === 0x200d) return 0;
  // Astral plane: emoji, supplementary symbols — always wide.
  if (cp > 0xffff) return 2;
  // BMP emoji-ish ranges that render wide on most terminals.
  if (cp >= 0x2300 && cp <= 0x23ff) return 2; // misc technical (⌚ ⏱ ⚠)
  if (cp >= 0x2600 && cp <= 0x27bf) return 2; // misc symbols + dingbats (☀ ⚡ ✱)
  if (cp >= 0x2b00 && cp <= 0x2bff) return 2; // misc symbols and arrows
  return 1;
}

// Walks `s` once, copying ANSI CSI (e.g. colors) and OSC 8 hyperlink escapes
// through unchanged while counting visible cells. Stops once `budget` cells
// have been emitted; returns the truncation point, or `s.length` if `s` fits.
function findTruncationCut(s: string, budget: number): { cut: number; width: number } {
  let i = 0;
  let width = 0;
  while (i < s.length) {
    if (s.charCodeAt(i) === 0x1b && s[i + 1] === '[') {
      // CSI: ESC [ ... <final byte 0x40-0x7E>
      let j = i + 2;
      while (j < s.length) {
        const code = s.charCodeAt(j);
        if (code >= 0x40 && code <= 0x7e) break;
        j++;
      }
      i = j + 1;
      continue;
    }
    if (s.charCodeAt(i) === 0x1b && s[i + 1] === ']') {
      // OSC 8 hyperlink: ESC ] ... ESC \ (or BEL)
      const stIdx = s.indexOf(`${ESC}\\`, i);
      const belIdx = s.indexOf('\x07', i);
      const end = stIdx !== -1 && (belIdx === -1 || stIdx < belIdx) ? stIdx + 2 : belIdx + 1;
      i = end > 0 ? end : s.length;
      continue;
    }
    const cp = s.codePointAt(i);
    if (cp === undefined) break;
    const charLen = cp > 0xffff ? 2 : 1;
    const w = cellWidth(cp);
    if (width + w > budget) return { cut: i, width };
    width += w;
    i += charLen;
  }
  return { cut: s.length, width };
}

function visibleWidth(s: string): number {
  return findTruncationCut(s, Number.POSITIVE_INFINITY).width;
}

function truncateToWidth(s: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (visibleWidth(s) <= maxWidth) return s;
  const budget = Math.max(0, maxWidth - 1); // reserve 1 cell for the ellipsis
  const { cut } = findTruncationCut(s, budget);
  const head = s.slice(0, cut);
  // Only emit a reset if the kept portion actually opened an ANSI sequence —
  // otherwise terminals that don't process escapes show literal "[0m".
  const reset = head.includes(ESC) ? RESET : '';
  return `${head}${reset}${ELLIPSIS}`;
}

export function renderRow(names: string[], ctx: RenderCtx, maxWidth?: number): string {
  const parts: string[] = [];
  for (const name of names) {
    const renderer = REGISTRY[name];
    if (!renderer) continue;
    const out = renderer(ctx);
    if (out !== null && out !== '') parts.push(out);
  }
  const joined = parts.join(SEPARATOR);
  return maxWidth !== undefined ? truncateToWidth(joined, maxWidth) : joined;
}
