import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CodeBlockComponent } from './code-block.component';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';
import type { CodePiece } from '../content/content.types';

interface Column {
  readonly fw: Framework;
  readonly label: string;
  readonly piece: CodePiece;
}

/** Three parallel framework code samples for the same feature. */
@Component({
  selector: 'app-tri-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlockComponent],
  template: `
    @if (title()) {
      <span class="label-mono cap">{{ title() }}</span>
    }
    <div class="grid">
      @for (col of columns(); track col.fw) {
        <div class="col">
          <span class="label-mono fw" [attr.data-fw]="col.fw">{{ col.label }}</span>
          <app-code-block
            [code]="col.piece.code"
            [lang]="col.piece.lang"
            [highlightedHtml]="col.piece.html"
          />
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cap {
      display: block;
      color: var(--text-dim);
      margin-bottom: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .fw[data-fw='angular'] {
      color: var(--crimson);
    }
    .fw[data-fw='react'] {
      color: var(--sky);
    }
    .fw[data-fw='vue'] {
      color: var(--sage);
    }
    @media (max-width: 920px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TriCodeComponent {
  readonly title = input<string | undefined>();
  readonly angular = input<CodePiece | undefined>();
  readonly react = input<CodePiece | undefined>();
  readonly vue = input<CodePiece | undefined>();

  protected readonly columns = computed<Column[]>(() => {
    const map: Array<[Framework, CodePiece | undefined]> = [
      ['angular', this.angular()],
      ['react', this.react()],
      ['vue', this.vue()],
    ];
    return map
      .filter((e): e is [Framework, CodePiece] => e[1] !== undefined)
      .map(([fw, piece]) => ({ fw, label: FRAMEWORK_LABEL[fw], piece }));
  });
}
