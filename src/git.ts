import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitState } from './types.js';

const execFileP = promisify(execFile);

async function runGit(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileP('git', args, { cwd, windowsHide: true });
    return stdout.trim();
  } catch {
    return null;
  }
}

function parseOriginUrl(url: string | null): string | null {
  if (!url) return null;
  // HTTPS:  https://github.com/owner/name.git
  // HTTPS:  https://github.com/owner/name
  // SSH:    git@github.com:owner/name.git
  // SSH:    ssh://git@github.com/owner/name.git
  const trimmed = url.replace(/\.git$/, '').trim();
  const sshMatch = trimmed.match(/^(?:ssh:\/\/)?(?:[^@]+@)?[^:/]+[:/](.+?)$/);
  if (!sshMatch || !sshMatch[1]) return null;
  const path = sshMatch[1];
  // path may be "owner/name" or "owner/group/name" — keep last two segments
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(-2).join('/');
}

export async function collectGitState(cwd: string): Promise<GitState | null> {
  const inside = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') return null;

  const [branch, originUrl, status, aheadBehind] = await Promise.all([
    runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(cwd, ['remote', 'get-url', 'origin']),
    runGit(cwd, ['status', '--porcelain']),
    // ahead\tbehind. Returns null if no upstream is tracked.
    runGit(cwd, ['rev-list', '--left-right', '--count', '@{u}...HEAD']),
  ]);

  if (!branch) return null;

  const repo = parseOriginUrl(originUrl);
  const dirty = status !== null && status.length > 0;

  let behind = 0;
  let ahead = 0;
  if (aheadBehind) {
    // git rev-list --left-right --count @{u}...HEAD prints "<behind>\t<ahead>"
    const m = aheadBehind.split(/\s+/);
    behind = Number(m[0] ?? 0) || 0;
    ahead = Number(m[1] ?? 0) || 0;
  }

  return { branch, repo, originUrl, ahead, behind, dirty };
}

export async function getOriginUrl(cwd: string): Promise<string | null> {
  return runGit(cwd, ['remote', 'get-url', 'origin']);
}
