import type { Framework, Level } from '../core/levels';

export type OgVariant = 'gold' | 'sage' | 'crimson';

export interface RelatedLink {
  readonly framework: Framework;
  readonly slug: string;
}

/** Front-matter, normalized. No body — safe to ship in the catalogue. */
export interface ModuleMeta {
  readonly title: string;
  readonly slug: string;
  readonly framework: Framework;
  readonly level: Level;
  readonly order: number;
  readonly duration: number;
  readonly prerequisites: readonly string[];
  readonly updated: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly ogVariant: OgVariant;
  readonly related: readonly RelatedLink[];
  /** True when the file is a placeholder ("À venir") with no real body. */
  readonly stub: boolean;
}

export interface CodePiece {
  readonly code: string;
  readonly lang: string;
  readonly filename?: string;
  /** Shiki-highlighted HTML, generated at build (trusted). */
  readonly html: string;
}

export interface CheatItem {
  readonly title: string;
  readonly desc: string;
}

export type ContentBlock =
  | { readonly kind: 'prose'; readonly html: string }
  | { readonly kind: 'heading'; readonly depth: 2 | 3; readonly text: string; readonly id: string }
  | ({ readonly kind: 'code' } & CodePiece)
  | { readonly kind: 'callout'; readonly variant: 'info' | 'tip' | 'warn'; readonly html: string }
  | { readonly kind: 'compare'; readonly bad: CodePiece; readonly good: CodePiece }
  | { readonly kind: 'cheatsheet'; readonly items: readonly CheatItem[] };

export interface TocEntry {
  readonly id: string;
  readonly text: string;
  readonly depth: 2 | 3;
}

export interface CompiledModule {
  readonly meta: ModuleMeta;
  readonly blocks: readonly ContentBlock[];
  readonly toc: readonly TocEntry[];
}

/** A module key is `${framework}-${level}-${slug}`. */
export type ModuleKey = string;

export function moduleKey(framework: Framework, level: Level, slug: string): ModuleKey {
  return `${framework}-${level}-${slug}`;
}
