import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentService } from '../content/content.service';
import type { ModuleMeta } from '../content/content.types';
import { CHANGELOG, type ChangelogEntry, type ChangelogModuleRef } from './changelog.data';

const STORAGE_KEY = 'changelog:lastSeenId';

/** A changelog entry with its module refs resolved to live catalogue metadata. */
export interface ResolvedEntry extends ChangelogEntry {
  readonly items: readonly ModuleMeta[];
}

/**
 * Tracks which changelog entries the reader has already seen (persisted in
 * localStorage) and exposes the unseen ones for the first-visit modal. SSR-safe:
 * on the server `lastSeen` stays null and `hasUnseen` is false, so nothing renders.
 */
@Injectable({ providedIn: 'root' })
export class ChangelogService {
  private readonly content = inject(ContentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Newest entry id, used as the "seen" watermark. */
  readonly latestId = CHANGELOG[0]?.id ?? '';

  private readonly lastSeenId = signal<string | null>(this.read());

  /**
   * Entries the reader hasn't acknowledged, modules resolved. The watermark is
   * the id of the newest seen entry; everything above it in the (newest-first)
   * list is unseen. Unknown/absent id (first visit, or a removed entry) → all.
   */
  readonly unseen = computed<readonly ResolvedEntry[]>(() => {
    const seenId = this.lastSeenId();
    const seenIndex = seenId ? CHANGELOG.findIndex((e) => e.id === seenId) : -1;
    const fresh = seenIndex === -1 ? CHANGELOG : CHANGELOG.slice(0, seenIndex);
    return fresh.map((e) => ({
      ...e,
      items: e.modules.map((ref) => this.resolve(ref)).filter((m): m is ModuleMeta => !!m),
    }));
  });

  readonly hasUnseen = computed(() => this.isBrowser && this.unseen().length > 0);

  /** Mark everything up to the latest entry as seen so the modal stops popping. */
  markSeen(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(STORAGE_KEY, this.latestId);
    this.lastSeenId.set(this.latestId);
  }

  private read(): string | null {
    return this.isBrowser ? localStorage.getItem(STORAGE_KEY) : null;
  }

  private resolve(ref: ChangelogModuleRef): ModuleMeta | undefined {
    return this.content.meta(ref.framework, ref.level, ref.slug);
  }
}
