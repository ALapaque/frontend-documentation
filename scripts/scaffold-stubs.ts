/**
 * Writes a stub `.md` (front-matter + "À venir") for every catalogue entry
 * that doesn't have a file yet. Never overwrites authored content.
 * Run manually: `npm run scaffold:stubs`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from './catalog';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const CONTENT_DIR = join(ROOT, 'src', 'content');
const OG: Record<string, string> = { junior: 'sage', medior: 'gold', senior: 'crimson' };

const orderCounter: Record<string, number> = {};
let created = 0;
CATALOG.forEach((e) => {
  const groupKey = `${e.framework}-${e.level}`;
  const order = (orderCounter[groupKey] = (orderCounter[groupKey] ?? 0) + 1);
  const file = join(CONTENT_DIR, e.framework, e.level, `${e.slug}.md`);
  if (existsSync(file)) return;
  mkdirSync(dirname(file), { recursive: true });
  const fm = [
    '---',
    `title: ${JSON.stringify(e.title)}`,
    `slug: ${JSON.stringify(e.slug)}`,
    `framework: ${JSON.stringify(e.framework)}`,
    `level: ${JSON.stringify(e.level)}`,
    `order: ${order}`,
    `duration: ${e.duration}`,
    'prerequisites: []',
    'updated: 2026-05-22',
    `seoTitle: ${JSON.stringify(`${e.title} — ${e.framework}`)}`,
    `seoDescription: ${JSON.stringify(e.desc)}`,
    `ogVariant: ${JSON.stringify(OG[e.level])}`,
    'stub: true',
    'related: []',
    '---',
    '',
    'À venir.',
    '',
  ].join('\n');
  writeFileSync(file, fm);
  created++;
});

console.log(`[stubs] created ${created} stub file(s).`);
