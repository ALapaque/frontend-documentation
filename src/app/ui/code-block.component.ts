import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SafeHtmlPipe } from '../core/safe-html.pipe';

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
  imports: [SafeHtmlPipe],
  template: `
    <figure class="block">
      <figcaption class="bar">
        <span class="label-mono lang">{{ filename() || lang() }}</span>
        <button type="button" class="copy" (click)="copy()" [attr.aria-label]="'Copier le code'">
          {{ copied() ? 'Copié' : 'Copier' }}
        </button>
      </figcaption>
      @if (highlightedHtml()) {
        <div class="pre" [innerHTML]="highlightedHtml() | safeHtml"></div>
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
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--bg-inset);
      box-shadow: var(--shadow-1);
      overflow: hidden;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px 9px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
    }
    .lang {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--on-ink-soft);
    }
    .lang::before {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent);
    }
    .copy {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--on-ink-soft);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: var(--radius-sm);
      padding: 4px 10px;
      transition: color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out),
        background var(--dur) var(--ease-out);
    }
    .copy:hover {
      color: #fff;
      border-color: var(--accent);
      background: var(--accent);
    }
    .pre {
      margin: 0;
      padding: 18px 20px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.65;
      tab-size: 2;
      color: var(--on-ink);
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
