import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import type { TocEntry } from '../content/content.types';

/** Sticky table of contents with scroll-spy (browser only). */
@Component({
  selector: 'app-toc-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="label-mono">Sommaire</span>
    <nav>
      @for (entry of toc(); track entry.id) {
        <a
          [href]="'#' + entry.id"
          [class.sub]="entry.depth === 3"
          [class.active]="active() === entry.id"
        >
          {{ entry.text }}
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      border-left: 2px solid var(--border-strong);
      padding-left: 14px;
    }
    a {
      color: var(--text-soft);
      font-size: 14px;
      line-height: 1.4;
      border-left: 3px solid transparent;
      margin-left: -16px;
      padding-left: 13px;
      transition: color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out);
    }
    a:hover {
      color: var(--ink);
    }
    a.sub {
      padding-left: 27px;
      font-size: 13px;
    }
    a.active {
      color: var(--accent);
      font-weight: 700;
      border-left-color: var(--accent);
    }
  `,
})
export class TocSidebarComponent {
  readonly toc = input.required<readonly TocEntry[]>();
  protected readonly active = signal<string>('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ids = this.toc().map((e) => e.id);
      const els = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      if (!els.length) return;
      if (!this.active()) this.active.set(ids[0]);

      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) this.active.set(e.target.id);
          }
        },
        { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
      );
      els.forEach((el) => observer.observe(el));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
