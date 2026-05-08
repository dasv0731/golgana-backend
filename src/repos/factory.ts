import { env } from '../env.js';
import type { Repos } from './interfaces.js';
import { buildJsonRepos } from './json/factory.js';
import { buildDynamoRepos } from './dynamo/factory.js';

let cached: Repos | null = null;

export function getRepos(): Repos {
  if (cached) return cached;
  if (env.STORAGE_DRIVER === 'json') {
    cached = buildJsonRepos(env.DATA_DIR);
    return cached;
  }
  if (env.STORAGE_DRIVER === 'dynamo') {
    cached = buildDynamoRepos();
    return cached;
  }
  throw new Error(`STORAGE_DRIVER not implemented: ${env.STORAGE_DRIVER}`);
}

/** Reset interno (test-only). */
export function resetRepos(): void {
  cached = null;
}
