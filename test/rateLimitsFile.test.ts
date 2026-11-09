import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRateLimits } from '../src/rateLimitsFile.ts';
import type { ClaudePayload } from '../src/types.ts';

const NOW_MS = 1_794_000_000_500;
const base = { model: { display_name: 'Opus' }, workspace: { current_dir: '.' } };

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'ppstatusline-rl-'));
}

function payload(rate_limits: ClaudePayload['rate_limits']): ClaudePayload {
  return { ...base, rate_limits };
}

test('writes both windows and the render time in epoch seconds', () => {
  const dir = tempDir();
  const path = join(dir, 'nested', 'rate-limits.json');
  const seven_day = { used_percentage: 41.5, resets_at: 1_794_091_800 };
  const five_hour = { used_percentage: 12, resets_at: 1_794_010_000 };

  assert.equal(writeRateLimits(payload({ seven_day, five_hour }), path, NOW_MS), true);

  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { seven_day, five_hour, at: 1_794_000_000 });
  assert.deepEqual(readdirSync(join(dir, 'nested')), ['rate-limits.json']);
});

test('writes seven_day as null when only five_hour is present', () => {
  const path = join(tempDir(), 'rate-limits.json');
  const five_hour = { used_percentage: 7, resets_at: 1_794_010_000 };

  assert.equal(writeRateLimits(payload({ five_hour }), path, NOW_MS), true);

  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { seven_day: null, five_hour, at: 1_794_000_000 });
});

test('writes nothing when the payload has no rate limits', () => {
  const dir = tempDir();
  const path = join(dir, 'rate-limits.json');

  assert.equal(writeRateLimits(base as ClaudePayload, path, NOW_MS), false);
  assert.equal(writeRateLimits(payload({}), path, NOW_MS), false);

  assert.equal(existsSync(path), false);
});

test('a write error returns false without throwing', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'blocker'), 'not a directory');
  const seven_day = { used_percentage: 50, resets_at: 1_794_091_800 };

  assert.equal(writeRateLimits(payload({ seven_day }), join(dir, 'blocker', 'rate-limits.json'), NOW_MS), false);
});

test('a failed rename leaves no temp file behind', () => {
  const dir = tempDir();
  const target = join(dir, 'rate-limits.json');
  mkdirSync(join(target, 'occupied'), { recursive: true });
  const seven_day = { used_percentage: 50, resets_at: 1_794_091_800 };

  assert.equal(writeRateLimits(payload({ seven_day }), target, NOW_MS), false);

  assert.deepEqual(readdirSync(dir), ['rate-limits.json']);
});
