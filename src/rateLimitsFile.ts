import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ClaudePayload } from './types.js';

export const RATE_LIMITS_FILE = join(homedir(), '.claude', 'statusline-cache', 'rate-limits.json');

export function writeRateLimits(payload: ClaudePayload, path: string = RATE_LIMITS_FILE, now: number = Date.now()): boolean {
  const limits = payload.rate_limits;
  if (!limits || (!limits.seven_day && !limits.five_hour)) return false;
  const record = {
    seven_day: limits.seven_day ?? null,
    five_hour: limits.five_hour ?? null,
    at: Math.floor(now / 1000),
  };
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, JSON.stringify(record), 'utf8');
    renameSync(tmp, path);
    return true;
  } catch {
    try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    return false;
  }
}
