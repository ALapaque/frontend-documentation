/**
 * E2E smoke test: fetches every route in the built sitemap and asserts 200.
 * Assumes the SSR server is already running.
 *
 *   npm run build && npm run serve:ssr:frontend-documentation &
 *   BASE=http://localhost:4000 node scripts/smoke.mjs
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4000';
const SITEMAP = 'dist/frontend-documentation/browser/sitemap.xml';

const xml = readFileSync(SITEMAP, 'utf8');
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/^https?:\/\/[^/]+/, ''),
);

let failures = 0;
for (const path of paths) {
  const res = await fetch(`${BASE}${path}`);
  if (res.status !== 200) {
    console.error(`FAIL ${res.status} ${path}`);
    failures++;
  }
}

console.log(`Checked ${paths.length} routes, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
