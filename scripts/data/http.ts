/**
 * Polite, cached HTTP for the data build.
 *
 * - One request at a time, with a pause between network requests.
 * - Up to four attempts with exponential backoff on network errors and 5xx.
 * - A generic User-Agent (no personal data).
 * - Every response is cached under .cache/ with its retrieval date, so a
 *   rebuild can run fully offline (`--offline`) and the server is hit once.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');
export const CACHE = join(ROOT, '.cache');

const USER_AGENT = 'Mozilla/5.0 (compatible; open-data-builder/1.0)';
const PAUSE_MS = 1500;
const ATTEMPTS = 4;

export interface CacheEntry {
  url: string;
  file: string;
  retrieved: string;
  sha256: string;
  bytes: number;
}

const MANIFEST = join(CACHE, 'manifest.json');

function loadManifest(): Record<string, CacheEntry> {
  if (!existsSync(MANIFEST)) return {};
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, CacheEntry>;
}

function saveManifest(m: Record<string, CacheEntry>): void {
  mkdirSync(CACHE, { recursive: true });
  const sorted = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
}

let lastRequest = 0;

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export interface FetchOptions {
  offline: boolean;
  refresh: boolean;
}

export const options: FetchOptions = {
  offline: process.argv.includes('--offline'),
  refresh: process.argv.includes('--refresh'),
};

/** Fetches `url` once and caches it at `.cache/<file>`. Returns the bytes and the cache entry. */
export async function cached(url: string, file: string): Promise<{ body: Buffer; entry: CacheEntry }> {
  const manifest = loadManifest();
  const path = join(CACHE, file);
  const known = manifest[url];
  if (known && existsSync(path) && !options.refresh) {
    return { body: readFileSync(path), entry: known };
  }
  if (options.offline) {
    throw new Error(`offline and not cached: ${url}`);
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const wait = lastRequest + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: '*/*' } });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length === 0) throw new Error('empty body');
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
      const entry: CacheEntry = {
        url,
        file,
        retrieved: new Date().toLocaleDateString('sv-SE'),
        sha256: createHash('sha256').update(body).digest('hex'),
        bytes: body.length,
      };
      manifest[url] = entry;
      saveManifest(manifest);
      console.log(`  fetched ${url} (${body.length} bytes)`);
      return { body, entry };
    } catch (err) {
      lastError = err;
      if ((err as { fatal?: boolean }).fatal) break;
      const backoff = 2000 * 2 ** (attempt - 1);
      console.warn(`  attempt ${attempt} failed for ${url}: ${(err as Error).message}; retrying in ${backoff} ms`);
      await sleep(backoff);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** LeyesBiblio pages are served as ISO-8859-1 (Windows-1252 in practice). */
export function decodeLatin1(body: Buffer): string {
  return new TextDecoder('windows-1252').decode(body);
}
