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
      gap: 8px;
    }
    .bad .tag {
      color: var(--crimson);
    }
    .good .tag {
      color: var(--sage);
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
