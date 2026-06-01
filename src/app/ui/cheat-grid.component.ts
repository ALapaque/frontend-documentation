import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SafeHtmlPipe } from '../core/safe-html.pipe';
import type { CheatItem } from '../content/content.types';

/** End-of-section recap grid. */
@Component({
  selector: 'app-cheat-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SafeHtmlPipe],
  template: `
    <div class="grid">
      @for (item of items(); track item.title) {
        <div class="cell">
          <h4 class="title">{{ item.title }}</h4>
          <p class="desc" [innerHTML]="item.desc | safeHtml"></p>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1px;
      background: var(--border);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--hi-edge), var(--shadow-1);
    }
    .cell {
      background: var(--glass);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      padding: 16px 18px;
      transition: background var(--dur) var(--ease);
    }
    .cell:hover {
      background: color-mix(in oklab, var(--accent) 10%, var(--glass));
    }
    .title {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .desc {
      font-size: 14px;
      color: var(--text-soft);
      line-height: 1.5;
    }
    .desc ::ng-deep code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--accent);
    }
  `,
})
export class CheatGridComponent {
  readonly items = input.required<readonly CheatItem[]>();
}
