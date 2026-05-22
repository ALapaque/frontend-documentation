import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Code presentation block.
 *
 * Phase 1 renders escaped source with a language label + copy action.
 * Phase 2 feeds `highlightedHtml` from the Shiki SSR pipeline; when present
 * it is rendered in place of the plain text (already sanitized at build).
 */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="block">
      <figcaption class="bar">
        <span class="label-mono lang">{{ filename() || lang() }}</span>
        <button type="button" class="copy" (click)="copy()" [attr.aria-label]="'Copier le code'">
          {{ copied() ? 'Copié' : 'Copier' }}
        </button>
      </figcaption>
      @if (highlightedHtml()) {
        <div class="pre" [innerHTML]="highlightedHtml()"></div>
      } @else {
        <pre class="pre"><code>{{ code() }}</code></pre>
      }
    </figure>
  `,
  styles: `
    :host {
      display: block;
    }
    .block {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-card);
      overflow: hidden;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--bg-soft);
    }
    .lang {
      color: var(--text-dim);
    }
    .copy {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 3px 9px;
      transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
    }
    .copy:hover {
      color: var(--gold);
      border-color: var(--gold-soft);
    }
    .pre {
      margin: 0;
      padding: 16px 18px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .pre ::ng-deep pre {
      margin: 0;
      background: transparent !important;
    }
  `,
})
export class CodeBlockComponent {
  readonly code = input<string>('');
  readonly lang = input<string>('ts');
  readonly filename = input<string>('');
  /** Pre-highlighted HTML produced by the Shiki build step (trusted). */
  readonly highlightedHtml = input<string | null>(null);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    if (!this.isBrowser || !navigator.clipboard) return;
    await navigator.clipboard.writeText(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }
}
