import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PrInfo, PrState } from './types.js';

const execFileP = promisify(execFile);

type GhPrJson = {
  number: number;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  statusCheckRollup?: Array<{
    status?: string;       // QUEUED | IN_PROGRESS | COMPLETED
    conclusion?: string;   // SUCCESS | FAILURE | CANCELLED | NEUTRAL | SKIPPED | TIMED_OUT | ACTION_REQUIRED
  }>;
};

function deriveState(pr: GhPrJson): PrState {
  if (pr.state !== 'OPEN') return 'CLOSED_OR_MERGED';
  const checks = pr.statusCheckRollup ?? [];
  if (checks.length === 0) return 'OPEN_PASSING';
  const anyPending = checks.some(
    (c) => c.status && c.status !== 'COMPLETED',
  );
  const anyFailed = checks.some(
    (c) =>
      c.conclusion === 'FAILURE' ||
      c.conclusion === 'CANCELLED' ||
      c.conclusion === 'TIMED_OUT' ||
      c.conclusion === 'ACTION_REQUIRED',
  );
  if (anyPending || anyFailed) return 'OPEN_PENDING_OR_FAILING';
  return 'OPEN_PASSING';
}

export async function fetchPrInfo(
  cwd: string,
  branch: string,
): Promise<PrInfo | null> {
  try {
    const { stdout } = await execFileP(
      'gh',
      [
        'pr',
        'list',
        '--head',
        branch,
        '--json',
        'number,url,state,statusCheckRollup',
        '--limit',
        '1',
      ],
      { cwd, windowsHide: true },
    );
    const arr = JSON.parse(stdout.trim()) as GhPrJson[];
    if (!arr.length || !arr[0]) return null;
    const pr = arr[0];
    return { number: pr.number, url: pr.url, state: deriveState(pr) };
  } catch {
    // gh not installed, not authed, network error, etc. — silently no PR.
    return null;
  }
}
