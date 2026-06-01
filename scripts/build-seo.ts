/**
 * Generates SEO/discovery artifacts from the compiled catalogue, into public/:
 *   - sitemap.xml   every prerendered route
 *   - llms.txt      a plain-text map of the content for crawling LLMs
 *   - robots.txt    allow-all + sitemap pointer
 *   - og/*.svg      one OpenGraph card per module + a default
 *
 * Runs after build-content (see the `content` npm script).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { CATALOGUE } from '../src/content/generated/catalogue';
import { COMPARE_LIST } from '../src/content/generated/compare-list';
import { BLOG_LIST } from '../src/content/generated/blog-list';
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from '../src/app/core/site';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PUBLIC = join(ROOT, 'public');
const OG_DIR = join(PUBLIC, 'og');

const FONT_FILES = [
  join(ROOT, 'node_modules/@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf'),
  join(ROOT, 'node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
];

const FRAMEWORK_LABEL: Record<string, string> = {
  angular: 'Angular',
  react: 'React',
  vue: 'Vue',
  web: 'Web',
  css: 'CSS',
  typescript: 'TypeScript',
  tooling: 'Outils',
};
const SECTIONS = ['angular', 'react', 'vue', 'web', 'css', 'typescript', 'tooling'];
const LEVEL_LABEL: Record<string, string> = {
  junior: 'Junior',
  medior: 'Medior',
  senior: 'Senior',
  next: 'Next',
};
const OG_COLOR: Record<string, string> = { gold: '#C9A876', sage: '#8FA68E', crimson: '#B86F6F', iris: '#9D92C7' };

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function routes(): string[] {
  const r = ['/', '/search', '/about', '/compare', '/blog'];
  for (const fw of SECTIONS) r.push(`/${fw}`);
  for (const c of COMPARE_LIST) r.push(`/compare/${c.topic}`);
  for (const p of BLOG_LIST) r.push(`/blog/${p.slug}`);
  for (const m of CATALOGUE) r.push(`/${m.framework}/${m.level}/${m.slug}`);
  return r;
}

function sitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes()
    .map((path) => `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function llms(): string {
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE} — documentation pédagogique Angular, React et Vue, du Junior au Senior.`,
    '',
  ];
  for (const fw of SECTIONS) {
    lines.push(`## ${FRAMEWORK_LABEL[fw]}`, '');
    for (const m of CATALOGUE.filter((x) => x.framework === fw)) {
      const tag = m.stub ? ' (à venir)' : '';
      lines.push(`- [${m.title}](${SITE_URL}/${fw}/${m.level}/${m.slug}) — ${LEVEL_LABEL[m.level]}${tag}: ${m.seoDescription}`);
    }
    lines.push('');
  }
  lines.push('## Comparatifs', '');
  for (const c of COMPARE_LIST) {
    lines.push(`- [${c.title}](${SITE_URL}/compare/${c.topic}) — ${c.seoDescription || c.lead}`);
  }
  lines.push('');
  return lines.join('\n');
}

function robots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/** Wrap a title onto up to 3 lines of ~22 chars for the OG card. */
function wrap(text: string, max = 22, maxLines = 3): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

function ogCard(opts: { eyebrow: string; title: string; color: string }): string {
  const titleLines = wrap(opts.title);
  const tspans = titleLines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 84}">${xml(line)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A0C"/>
  <rect x="0" y="0" width="1200" height="6" fill="${opts.color}"/>
  <text x="80" y="150" font-family="JetBrains Mono" font-size="26" letter-spacing="6" fill="${opts.color}">${xml(opts.eyebrow.toUpperCase())}</text>
  <text x="80" y="290" font-family="Fraunces" font-size="78" fill="#EDE7DB">${tspans}</text>
  <text x="80" y="560" font-family="JetBrains Mono" font-size="24" letter-spacing="4" fill="#A39E92">${xml(SITE_NAME.toUpperCase())} · 2026</text>
</svg>\n`;
}

function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Fraunces' },
    fitTo: { mode: 'width', value: 1200 },
  });
  return resvg.render().asPng();
}

function main(): void {
  rmSync(OG_DIR, { recursive: true, force: true });
  mkdirSync(OG_DIR, { recursive: true });

  writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap());
  writeFileSync(join(PUBLIC, 'llms.txt'), llms());
  writeFileSync(join(PUBLIC, 'robots.txt'), robots());

  writeFileSync(
    join(OG_DIR, 'default.png'),
    svgToPng(ogCard({ eyebrow: 'Practical Docs', title: SITE_TAGLINE, color: OG_COLOR['gold'] })),
  );
  for (const m of CATALOGUE) {
    const svg = ogCard({
      eyebrow: `${FRAMEWORK_LABEL[m.framework]} · ${LEVEL_LABEL[m.level]}`,
      title: m.title,
      color: OG_COLOR[m.ogVariant] ?? OG_COLOR['gold'],
    });
    writeFileSync(join(OG_DIR, `${m.framework}-${m.level}-${m.slug}.png`), svgToPng(svg));
  }

  console.log(`[seo] sitemap (${routes().length} urls), llms.txt, robots.txt, ${CATALOGUE.length + 1} OG cards (PNG).`);
}

main();
