// Background worker. Spawned detached by cache.ts when the PR cache is stale.
// Args: <cacheFilePath> <cwd> <branch>
// Fetches fresh PR data via gh and writes the cache file. Never blocks anyone.

import { fetchPrInfo } from './gh.js';
import { writeCacheAtomic } from './cache.js';

async function main(): Promise<void> {
  const [, , cachePath, cwd, branch] = process.argv;
  if (!cachePath || !cwd || !branch) {
    process.exit(1);
  }
  try {
    const value = await fetchPrInfo(cwd, branch);
    writeCacheAtomic(cachePath, { value, fetchedAt: Date.now() });
  } catch {
    // Swallow — this is a background process, no one is watching.
  }
}

void main();
