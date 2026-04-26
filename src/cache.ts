import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPrInfo } from './gh.js';
import type { PrInfo } from './types.js';

type CacheRecord = {
  value: PrInfo | null;
  fetchedAt: number;
};

const CACHE_DIR = join(homedir(), '.claude', 'statusline-cache');

function sanitizeBranch(branch: string): string {
  return branch.replace(/\//g, '__').replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function repoHash(originUrl: string): string {
  return createHash('sha1').update(originUrl).digest('hex').slice(0, 12);
}

export function cachePathFor(originUrl: string, branch: string): string {
  return join(CACHE_DIR, `pr-${repoHash(originUrl)}-${sanitizeBranch(branch)}.json`);
}

function readCache(path: string): CacheRecord | null {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as CacheRecord;
  } catch {
    return null;
  }
}

export function writeCacheAtomic(path: string, record: CacheRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(record), 'utf8');
  renameSync(tmp, path);
}

function spawnBgRefresh(cachePath: string, cwd: string, branch: string): void {
  // Path to bg-pr-refresh.js, sibling of this compiled file in dist/.
  const here = dirname(fileURLToPath(import.meta.url));
  const bgScript = join(here, 'bg-pr-refresh.js');
  const child = spawn(process.execPath, [bgScript, cachePath, cwd, branch], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

export type GetPrOpts = {
  cwd: string;
  branch: string;
  originUrl: string;
  ttlSeconds: number;
};

export async function getOrRefreshPr(opts: GetPrOpts): Promise<PrInfo | null> {
  const path = cachePathFor(opts.originUrl, opts.branch);
  const cached = readCache(path);
  const now = Date.now();
  const ttlMs = opts.ttlSeconds * 1000;

  if (!cached) {
    // Cold path: synchronous fetch.
    const value = await fetchPrInfo(opts.cwd, opts.branch);
    writeCacheAtomic(path, { value, fetchedAt: now });
    return value;
  }

  if (now - cached.fetchedAt < ttlMs) {
    return cached.value;
  }

  // Stale: return what we have, refresh in background.
  spawnBgRefresh(path, opts.cwd, opts.branch);
  return cached.value;
}
