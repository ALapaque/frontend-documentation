/**
 * Build-time content compiler.
 *
 * Reads every `src/content/{framework}/{level}/{slug}.md`, parses front-matter
 * + body into typed content blocks, highlights code with Shiki, and emits:
 *   - src/content/generated/modules/{key}.json   (one CompiledModule per file)
 *   - src/content/generated/catalogue.ts          (all ModuleMeta, no body)
 *   - src/content/generated/loaders.ts            (key -> lazy JSON import)
 *
 * Runs via `npm run content` (and the pre* hooks before build/start).
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { createHighlighter, type Highlighter } from 'shiki';
import type {
  BlogMeta,
  CheatItem,
  CodePiece,
  CompareMeta,
  CompiledBlog,
  CompiledCompare,
  CompiledModule,
  ContentBlock,
  DemoKind,
  ModuleMeta,
  OgVariant,
  SearchDoc,
  TocEntry,
} from '../src/app/content/content.types';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const CONTENT_DIR = join(ROOT, 'src', 'content');
const OUT_DIR = join(CONTENT_DIR, 'generated');
const MODULES_DIR = join(OUT_DIR, 'modules');

const THEME = 'vesper';
const LANGS = ['ts', 'tsx', 'js', 'jsx', 'html', 'css', 'scss', 'json', 'bash', 'vue', 'diff', 'yaml', 'text'];

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
const mdInline = new MarkdownIt({ html: true, linkify: true, typographer: true });

const FRAMEWORKS = new Set(['angular', 'react', 'vue', 'web', 'css', 'typescript', 'tooling', 'architecture', 'ia']);
const DEMO_KINDS = new Set<string>([
  'flexbox',
  'grid',
  'positioning',
  'transitions',
  'transforms',
  'units',
  'colors',
  'scroll',
  'gradient',
  'anchor',
  'popover',
]);
const LEVELS = new Set(['junior', 'medior', 'senior', 'next']);
const OG_BY_LEVEL: Record<string, OgVariant> = { junior: 'sage', medior: 'gold', senior: 'crimson', next: 'iris' };

/** YAML parses unquoted dates as Date objects; normalize to YYYY-MM-DD. */
function fmtDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value ?? '');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Concatenated plain text of a module body, for full-text search. */
function searchText(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'prose' || b.kind === 'callout') parts.push(stripHtml(b.html));
    else if (b.kind === 'heading') parts.push(b.text);
    else if (b.kind === 'cheatsheet') parts.push(b.items.map((i) => `${i.title} ${i.desc}`).join(' '));
  }
  return stripHtml(parts.join(' '));
}

function listMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'generated') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listMarkdown(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function highlight(hl: Highlighter, code: string, langRaw: string): string {
  const lang = LANGS.includes(langRaw) ? langRaw : 'text';
  return hl.codeToHtml(code.replace(/\n$/, ''), { lang, theme: THEME });
}

/** Parse `lang filename` or `lang:filename` info string. */
function parseFence(info: string): { lang: string; filename?: string } {
  const trimmed = info.trim();
  if (!trimmed) return { lang: 'text' };
  const [first, ...rest] = trimmed.split(/[:\s]+/);
  return { lang: first, filename: rest.join(' ') || undefined };
}

function parseCheatItems(body: string): CheatItem[] {
  const items: CheatItem[] = [];
  const blocks = body.split(/^\s*-\s+/m).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const title = /title:\s*["']?(.+?)["']?\s*$/m.exec(block)?.[1] ?? '';
    const desc = /desc:\s*["']?(.+?)["']?\s*$/m.exec(block)?.[1] ?? '';
    if (title) items.push({ title, desc });
  }
  return items;
}

interface ParseResult {
  blocks: ContentBlock[];
  toc: TocEntry[];
}

function parseBody(body: string, hl: Highlighter): ParseResult {
  const lines = body.split('\n');
  const blocks: ContentBlock[] = [];
  const toc: TocEntry[] = [];
  const usedIds = new Set<string>();
  let prose: string[] = [];

  const flushProse = () => {
    const text = prose.join('\n').trim();
    if (text) blocks.push({ kind: 'prose', html: md.render(text) });
    prose = [];
  };

  const uniqueId = (text: string): string => {
    let id = slugify(text) || 'section';
    let n = 2;
    while (usedIds.has(id)) id = `${slugify(text)}-${n++}`;
    usedIds.add(id);
    return id;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading (## or ###)
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushProse();
      const depth = (heading[1].length === 2 ? 2 : 3) as 2 | 3;
      const text = heading[2].trim();
      const id = uniqueId(text);
      blocks.push({ kind: 'heading', depth, text, id });
      toc.push({ id, text, depth });
      continue;
    }

    // Top-level fenced code block
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      flushProse();
      const { lang, filename } = parseFence(fence[1]);
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      const code = buf.join('\n');
      blocks.push({ kind: 'code', code, lang, filename, html: highlight(hl, code, lang) });
      continue;
    }

    // Container block :::name{attrs}
    const container = /^:::(\w+)(.*)$/.exec(line);
    if (container) {
      flushProse();
      const name = container[1];
      const attrs = container[2];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++]);
      const inner = buf.join('\n');

      if (name === 'callout') {
        const variant = (/type="(\w+)"/.exec(attrs)?.[1] ?? 'info') as 'info' | 'tip' | 'warn';
        blocks.push({ kind: 'callout', variant, html: md.render(inner.trim()) });
      } else if (name === 'compare') {
        blocks.push({ kind: 'compare', bad: extractPiece(inner, 'bad', hl), good: extractPiece(inner, 'good', hl) });
      } else if (name === 'cheatsheet') {
        blocks.push({ kind: 'cheatsheet', items: parseCheatItems(inner) });
      } else if (name === 'demo') {
        const kind = /kind="([\w-]+)"/.exec(attrs)?.[1];
        if (kind && DEMO_KINDS.has(kind)) {
          blocks.push({ kind: 'demo', demo: kind as DemoKind });
        } else if (inner.trim()) {
          blocks.push({ kind: 'prose', html: md.render(inner.trim()) });
        }
      } else if (name === 'tri') {
        const title = /title="([^"]+)"/.exec(attrs)?.[1];
        blocks.push({
          kind: 'tricode',
          title,
          angular: extractMaybePiece(inner, 'angular', hl),
          react: extractMaybePiece(inner, 'react', hl),
          vue: extractMaybePiece(inner, 'vue', hl),
        });
      } else {
        // Unknown container → render inner as prose so nothing is lost
        if (inner.trim()) blocks.push({ kind: 'prose', html: md.render(inner.trim()) });
      }
      continue;
    }

    prose.push(line);
  }
  flushProse();
  return { blocks, toc };
}

/** Pull the fenced code under a `::bad` / `::good` marker in a compare block. */
function extractPiece(inner: string, marker: 'bad' | 'good', hl: Highlighter): CodePiece {
  const re = new RegExp(`^::${marker}\\s*$([\\s\\S]*?)^::\\s*$`, 'm');
  const seg = re.exec(inner)?.[1] ?? '';
  const fence = /```(.*)\n([\s\S]*?)```/m.exec(seg);
  const lang = fence ? parseFence(fence[1]).lang : 'text';
  const code = fence ? fence[2].replace(/\n$/, '') : seg.trim();
  return { code, lang, html: highlight(hl, code, lang) };
}

/** Like extractPiece but returns undefined if the marker is absent. */
function extractMaybePiece(inner: string, marker: string, hl: Highlighter): CodePiece | undefined {
  const re = new RegExp(`^::${marker}\\s*$([\\s\\S]*?)^::\\s*$`, 'm');
  const seg = re.exec(inner)?.[1];
  if (seg === undefined) return undefined;
  const fence = /```(.*)\n([\s\S]*?)```/m.exec(seg);
  const lang = fence ? parseFence(fence[1]).lang : 'text';
  const code = fence ? fence[2].replace(/\n$/, '') : seg.trim();
  return { code, lang, html: highlight(hl, code, lang) };
}

function normalizeMeta(data: Record<string, unknown>, framework: string, level: string, slug: string, stub: boolean): ModuleMeta {
  const title = String(data['title'] ?? slug);
  return {
    title,
    slug,
    framework: framework as ModuleMeta['framework'],
    level: level as ModuleMeta['level'],
    order: Number(data['order'] ?? 99),
    duration: Number(data['duration'] ?? 0),
    prerequisites: Array.isArray(data['prerequisites']) ? (data['prerequisites'] as string[]) : [],
    updated: fmtDate(data['updated']),
    seoTitle: String(data['seoTitle'] ?? title),
    seoDescription: String(data['seoDescription'] ?? ''),
    ogVariant: (data['ogVariant'] as OgVariant) ?? OG_BY_LEVEL[level] ?? 'gold',
    related: Array.isArray(data['related']) ? (data['related'] as ModuleMeta['related']) : [],
    stub,
  };
}

async function main(): Promise<void> {
  const hl = await createHighlighter({ themes: [THEME], langs: LANGS });

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(MODULES_DIR, { recursive: true });

  const files = listMarkdown(CONTENT_DIR).sort();
  const metas: ModuleMeta[] = [];
  const keys: string[] = [];
  const searchDocs: SearchDoc[] = [];

  for (const file of files) {
    const parts = relative(CONTENT_DIR, file).split(sep);
    if (parts[0] === 'compare' || parts[0] === 'blog') continue; // handled separately below
    if (parts.length !== 3) {
      console.warn(`[content] skip (expected {fw}/{lvl}/{slug}.md): ${parts.join('/')}`);
      continue;
    }
    const [framework, level] = parts;
    const slug = parts[2].replace(/\.md$/, '');
    if (!FRAMEWORKS.has(framework) || !LEVELS.has(level)) {
      console.warn(`[content] skip (unknown framework/level): ${parts.join('/')}`);
      continue;
    }

    const raw = readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const explicitStub = data['stub'] === true;
    const { blocks, toc } = parseBody(content, hl);
    const stub = explicitStub || blocks.length === 0;
    const meta = normalizeMeta(data as Record<string, unknown>, framework, level, slug, stub);

    const key = `${framework}-${level}-${slug}`;
    const compiled: CompiledModule = { meta, blocks, toc };
    writeFileSync(join(MODULES_DIR, `${key}.json`), JSON.stringify(compiled));
    metas.push(meta);
    keys.push(key);
    searchDocs.push({
      id: key,
      framework: meta.framework,
      level: meta.level,
      slug: meta.slug,
      title: meta.title,
      desc: meta.seoDescription,
      text: searchText(blocks),
      stub: meta.stub,
    });
  }

  metas.sort((a, b) =>
    a.framework.localeCompare(b.framework) ||
    a.level.localeCompare(b.level) ||
    a.order - b.order,
  );

  const banner = '// AUTO-GENERATED by scripts/build-content.ts — do not edit.\n';
  writeFileSync(
    join(OUT_DIR, 'catalogue.ts'),
    banner +
      `import type { ModuleMeta } from '../../app/content/content.types';\n` +
      `export const CATALOGUE: ModuleMeta[] = ${JSON.stringify(metas, null, 2)};\n`,
  );

  const entries = keys
    .sort()
    .map(
      (k) =>
        `  '${k}': () => import('./modules/${k}.json') as unknown as Promise<{ default: CompiledModule }>,`,
    )
    .join('\n');
  writeFileSync(
    join(OUT_DIR, 'loaders.ts'),
    banner +
      `import type { CompiledModule } from '../../app/content/content.types';\n` +
      `export const MODULE_LOADERS: Record<string, () => Promise<{ default: CompiledModule }>> = {\n${entries}\n};\n`,
  );

  searchDocs.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    join(OUT_DIR, 'search.ts'),
    banner +
      `import type { SearchDoc } from '../../app/content/content.types';\n` +
      `export const SEARCH_DOCS: SearchDoc[] = ${JSON.stringify(searchDocs)};\n`,
  );

  // ---- Compare docs (src/content/compare/*.md) ----
  const compareDir = join(CONTENT_DIR, 'compare');
  const compareMetas: CompareMeta[] = [];
  const compareTopics: string[] = [];
  for (const file of files) {
    const parts = relative(CONTENT_DIR, file).split(sep);
    if (parts[0] !== 'compare' || parts.length !== 2) continue;
    const topic = parts[1].replace(/\.md$/, '');
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const d = data as Record<string, unknown>;
    const { blocks, toc } = parseBody(content, hl);
    const title = String(d['title'] ?? topic);
    const meta: CompareMeta = {
      topic,
      title,
      lead: String(d['lead'] ?? ''),
      updated: fmtDate(d['updated']),
      seoTitle: String(d['seoTitle'] ?? title),
      seoDescription: String(d['seoDescription'] ?? ''),
      related: Array.isArray(d['related']) ? (d['related'] as CompareMeta['related']) : [],
    };
    const compiled: CompiledCompare = { meta, blocks, toc };
    mkdirSync(join(OUT_DIR, 'compare'), { recursive: true });
    writeFileSync(join(OUT_DIR, 'compare', `${topic}.json`), JSON.stringify(compiled));
    compareMetas.push(meta);
    compareTopics.push(topic);
  }
  void compareDir;

  compareMetas.sort((a, b) => a.topic.localeCompare(b.topic));
  writeFileSync(
    join(OUT_DIR, 'compare-list.ts'),
    banner +
      `import type { CompareMeta } from '../../app/content/content.types';\n` +
      `export const COMPARE_LIST: CompareMeta[] = ${JSON.stringify(compareMetas, null, 2)};\n`,
  );
  const compareEntries = compareTopics
    .sort()
    .map(
      (t) =>
        `  '${t}': () => import('./compare/${t}.json') as unknown as Promise<{ default: CompiledCompare }>,`,
    )
    .join('\n');
  writeFileSync(
    join(OUT_DIR, 'compare-loaders.ts'),
    banner +
      `import type { CompiledCompare } from '../../app/content/content.types';\n` +
      `export const COMPARE_LOADERS: Record<string, () => Promise<{ default: CompiledCompare }>> = {\n${compareEntries}\n};\n`,
  );

  // ---- Blog posts (src/content/blog/*.md) ----
  const blogDir = join(CONTENT_DIR, 'blog');
  const blogMetas: BlogMeta[] = [];
  const blogSlugs: string[] = [];
  for (const file of files) {
    const parts = relative(CONTENT_DIR, file).split(sep);
    if (parts[0] !== 'blog' || parts.length !== 2) continue;
    const slug = parts[1].replace(/\.md$/, '');
    const { data, content } = matter(readFileSync(file, 'utf8'));
    const d = data as Record<string, unknown>;
    const { blocks, toc } = parseBody(content, hl);
    const title = String(d['title'] ?? slug);
    const coverRaw = d['cover'];
    const cover = (coverRaw === 'angular-v22' || coverRaw === 'vue-vapor'
      ? coverRaw
      : 'default') as BlogMeta['cover'];
    const meta: BlogMeta = {
      slug,
      title,
      lead: String(d['lead'] ?? ''),
      date: fmtDate(d['date']),
      author: String(d['author'] ?? ''),
      tags: Array.isArray(d['tags']) ? (d['tags'] as string[]).map(String) : [],
      cover,
      seoTitle: String(d['seoTitle'] ?? title),
      seoDescription: String(d['seoDescription'] ?? ''),
      related: Array.isArray(d['related']) ? (d['related'] as BlogMeta['related']) : [],
    };
    const compiled: CompiledBlog = { meta, blocks, toc };
    mkdirSync(join(OUT_DIR, 'blog'), { recursive: true });
    writeFileSync(join(OUT_DIR, 'blog', `${slug}.json`), JSON.stringify(compiled));
    blogMetas.push(meta);
    blogSlugs.push(slug);
  }
  void blogDir;

  // newest first
  blogMetas.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  writeFileSync(
    join(OUT_DIR, 'blog-list.ts'),
    banner +
      `import type { BlogMeta } from '../../app/content/content.types';\n` +
      `export const BLOG_LIST: BlogMeta[] = ${JSON.stringify(blogMetas, null, 2)};\n`,
  );
  const blogEntries = blogSlugs
    .sort()
    .map(
      (s) =>
        `  '${s}': () => import('./blog/${s}.json') as unknown as Promise<{ default: CompiledBlog }>,`,
    )
    .join('\n');
  writeFileSync(
    join(OUT_DIR, 'blog-loaders.ts'),
    banner +
      `import type { CompiledBlog } from '../../app/content/content.types';\n` +
      `export const BLOG_LOADERS: Record<string, () => Promise<{ default: CompiledBlog }>> = {\n${blogEntries}\n};\n`,
  );

  console.log(
    `[content] compiled ${metas.length} module(s), ${compareMetas.length} compare doc(s), ${blogMetas.length} blog post(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
