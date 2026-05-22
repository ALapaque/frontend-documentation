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
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-inset);
      box-shadow: var(--shadow-1), inset 0 1px 0 rgba(255, 255, 255, 0.03);
      overflow: hidden;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px 9px 16px;
      border-bottom: 1px solid var(--border-soft);
      background: color-mix(in oklab, #fff 2%, transparent);
    }
    .lang {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-dim);
    }
    .lang::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--gold-metallic);
      box-shadow: 0 0 8px -1px color-mix(in oklab, var(--gold) 60%, transparent);
    }
    .copy {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 4px 10px;
      transition: color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out),
        background var(--dur) var(--ease-out);
    }
    .copy:hover {
      color: var(--gold-bright);
      border-color: var(--hairline-gold);
      background: color-mix(in oklab, var(--gold) 8%, transparent);
    }
    .pre {
      margin: 0;
      padding: 18px 20px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.65;
      tab-size: 2;
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
