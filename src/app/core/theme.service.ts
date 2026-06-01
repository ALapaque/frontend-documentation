import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Three-state colour mode. 'auto' = follow OS preference. */
export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'pd:theme';
const ATTR = 'data-theme';

/**
 * Owns the document colour mode. Reads the user's persisted choice on boot,
 * applies it as a [data-theme] attribute on <html>, and keeps the attribute
 * in sync with mode changes. In 'auto' it removes the attribute and lets the
 * CSS `prefers-color-scheme` rules win. SSR-safe: on the server it returns
 * 'auto' and does nothing.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<ThemeMode>(this.read());

  /** The mode that's actually being rendered (auto → resolved against OS). */
  readonly resolved = computed<'light' | 'dark'>(() => {
    const m = this.mode();
    if (m !== 'auto') return m;
    if (!this.isBrowser) return 'dark';
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  constructor() {
    if (!this.isBrowser) return;
    // Sync DOM whenever the mode changes.
    effect(() => {
      const m = this.mode();
      const html = document.documentElement;
      if (m === 'auto') html.removeAttribute(ATTR);
      else html.setAttribute(ATTR, m);
      localStorage.setItem(STORAGE_KEY, m);
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private read(): ThemeMode {
    if (!this.isBrowser) return 'auto';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  }
}
