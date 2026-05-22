import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CodeBlockComponent } from './code-block.component';
import type { CodePiece } from '../content/content.types';

/** Side-by-side bad/good comparison. */
@Component({
  selector: 'app-two-col-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlockComponent],
  template: `
    <div class="grid">
      <div class="col bad">
        <span class="label-mono tag">À éviter</span>
        <app-code-block
          [code]="bad().code"
          [lang]="bad().lang"
          [highlightedHtml]="bad().html"
        />
      </div>
      <div class="col good">
        <span class="label-mono tag">Préférer</span>
        <app-code-block
          [code]="good().code"
          [lang]="good().lang"
          [highlightedHtml]="good().html"
        />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      min-width: 0;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      width: fit-content;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border);
    }
    .tag::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px 1px currentColor;
    }
    .bad .tag {
      color: var(--level-senior);
      border-color: color-mix(in oklab, var(--level-senior) 45%, transparent);
      background: color-mix(in oklab, var(--level-senior) 12%, transparent);
    }
    .good .tag {
      color: var(--level-junior);
      border-color: color-mix(in oklab, var(--level-junior) 45%, transparent);
      background: color-mix(in oklab, var(--level-junior) 12%, transparent);
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TwoColCompareComponent {
  readonly bad = input.required<CodePiece>();
  readonly good = input.required<CodePiece>();
}
