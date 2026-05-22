import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type MiniSearch from 'minisearch';
import type { Framework, Level } from '../levels';

export interface SearchResult {
  readonly id: string;
  readonly framework: Framework;
  readonly level: Level;
  readonly slug: string;
  readonly title: string;
  readonly desc: string;
  readonly stub: boolean;
}

/**
 * Client-side full-text search. Both MiniSearch and the build-generated
 * documents are dynamically imported on first use (browser only), so neither
 * the library nor the index ships in the initial bundle. Readiness is exposed
 * as a signal, so `search()` re-runs reactively once the index is built.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly index = signal<MiniSearch | null>(null);
  private loading = false;

  private ensureIndex(): MiniSearch | null {
    if (!this.isBrowser) return null;
    const idx = this.index();
    if (idx) return idx;
    if (!this.loading) {
      this.loading = true;
      void this.build();
    }
    return null;
  }

  private async build(): Promise<void> {
    const [{ default: MiniSearchCtor }, { SEARCH_DOCS }] = await Promise.all([
      import('minisearch'),
      import('../../../content/generated/search'),
    ]);
    const index = new MiniSearchCtor({
      fields: ['title', 'desc', 'text'],
      storeFields: ['framework', 'level', 'slug', 'title', 'desc', 'stub'],
      searchOptions: { boost: { title: 3, desc: 2 }, prefix: true, fuzzy: 0.2 },
    });
    index.addAll(SEARCH_DOCS as unknown as Array<Record<string, unknown>>);
    this.index.set(index);
  }

  search(query: string, limit = 12): SearchResult[] {
    const q = query.trim();
    const index = this.ensureIndex();
    if (!index || q.length < 2) return [];
    return index.search(q).slice(0, limit).map((r) => ({
      id: String(r.id),
      framework: r['framework'] as Framework,
      level: r['level'] as Level,
      slug: r['slug'] as string,
      title: r['title'] as string,
      desc: r['desc'] as string,
      stub: r['stub'] as boolean,
    }));
  }
}
