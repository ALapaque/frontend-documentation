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
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: var(--shadow-2);
    }
    .bad {
      background: color-mix(in oklab, var(--accent-2) 8%, var(--bg-card));
    }
    .good {
      background: color-mix(in oklab, var(--level-junior) 8%, var(--bg-card));
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
      color: #fff;
      border-radius: var(--radius-pill);
      padding: 4px 12px;
      width: fit-content;
    }
    .tag::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
    }
    .bad .tag {
      background: var(--accent-2);
    }
    .good .tag {
      background: var(--level-junior);
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
