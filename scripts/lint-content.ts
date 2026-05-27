/**
 * Linter de cohérence FR pour le contenu pédagogique.
 *
 * Applique les règles de `scripts/fr-glossary.ts` à la PROSE de chaque
 * `src/content/{framework}/{level}/{slug}.md`. Pour éviter les faux positifs,
 * sont masqués avant analyse : les blocs de code clôturés (``` / ~~~), le code
 * inline (`…`), les URLs de liens markdown, et les clés techniques de
 * front-matter (slug, framework, related, …).
 *
 * Lancé via `npm run lint:content`. Sort en code 1 si une règle `error` est
 * enfreinte (utilisé par la CI).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, type Rule } from './fr-glossary';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const CONTENT_DIR = join(ROOT, 'src', 'content');

/** Clés de front-matter dont la valeur est un identifiant technique, pas de la prose. */
const TECH_FM_KEYS =
  /^\s*(slug|framework|level|order|duration|prerequisites|related|ogVariant|updated|prev|next|icon|color|tags|seoKeywords)\s*:/;

interface Finding {
  file: string;
  line: number;
  col: number;
  rule: Rule;
  text: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'generated') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Remplace tous les caractères (hors saut de ligne) par des espaces : préserve les offsets. */
const blank = (s: string): string => s.replace(/[^\n]/g, ' ');

/** Masque le code inline et les URLs de liens dans une ligne de prose. */
function maskInline(line: string): string {
  return line
    .replace(/`[^`]*`/g, blank)
    .replace(/\]\([^)]*\)/g, (m) => ']' + ' '.repeat(m.length - 1));
}

/** Masque code, front-matter technique et URLs ; renvoie une vue alignée de la prose. */
function maskProse(src: string): string[] {
  let inFence = false;
  let fenceMarker = '';
  let inFrontmatter = false;
  let fmDelims = 0;

  return src.split('\n').map((line, i) => {
    const trimmed = line.trimStart();

    if (trimmed === '---' && (i === 0 || inFrontmatter)) {
      fmDelims++;
      inFrontmatter = fmDelims === 1;
      return blank(line);
    }
    if (inFrontmatter) {
      return TECH_FM_KEYS.test(line) ? blank(line) : maskInline(line);
    }

    const fence = trimmed.match(/^(```|~~~)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
      return blank(line);
    }
    if (inFence) return blank(line);

    return maskInline(line);
  });
}

function lintFile(path: string): Finding[] {
  const lines = maskProse(readFileSync(path, 'utf8'));
  const findings: Finding[] = [];
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.pattern.exec(line)) !== null) {
        findings.push({ file: path, line: idx + 1, col: m.index + 1, rule, text: m[0] });
        if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
      }
    }
  });
  return findings;
}

const files = walk(CONTENT_DIR);
const findings = files.flatMap(lintFile);
const errors = findings.filter((f) => f.rule.severity === 'error');
const warns = findings.filter((f) => f.rule.severity === 'warn');

for (const f of [...errors, ...warns].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
  const loc = `${relative(ROOT, f.file)}:${f.line}:${f.col}`;
  console.log(`${loc}  ${f.rule.severity}  [${f.rule.id}] « ${f.text} » — ${f.rule.message}`);
}

console.log(
  `\n${files.length} fichiers analysés — ${errors.length} erreur(s), ${warns.length} avertissement(s).`,
);

if (errors.length > 0) {
  console.error('\n✗ Des règles de cohérence FR sont enfreintes (voir ci-dessus).');
  process.exit(1);
}
console.log('✓ Cohérence FR : aucune erreur.');
