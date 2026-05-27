import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentService } from '../content/content.service';
import type { ModuleMeta } from '../content/content.types';
import { CHANGELOG, type ChangelogEntry, type ChangelogModuleRef } from './changelog.data';

const STORAGE_KEY = 'changelog:lastSeen';

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

  /** Newest entry date, used as the "seen" watermark. */
  readonly latestDate = CHANGELOG[0]?.date ?? '';

  private readonly lastSeen = signal<string | null>(this.read());

  /** Entries newer than what the reader last acknowledged, modules resolved. */
  readonly unseen = computed<readonly ResolvedEntry[]>(() => {
    const seen = this.lastSeen();
    return CHANGELOG.filter((e) => !seen || e.date > seen).map((e) => ({
      ...e,
      items: e.modules.map((ref) => this.resolve(ref)).filter((m): m is ModuleMeta => !!m),
    }));
  });

  readonly hasUnseen = computed(() => this.isBrowser && this.unseen().length > 0);

  /** Mark everything up to the latest entry as seen so the modal stops popping. */
  markSeen(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(STORAGE_KEY, this.latestDate);
    this.lastSeen.set(this.latestDate);
  }

  private read(): string | null {
    return this.isBrowser ? localStorage.getItem(STORAGE_KEY) : null;
  }

  private resolve(ref: ChangelogModuleRef): ModuleMeta | undefined {
    return this.content.meta(ref.framework, ref.level, ref.slug);
  }
}
