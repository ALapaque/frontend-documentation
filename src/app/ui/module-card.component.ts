import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import type { ModuleMeta } from '../content/content.types';

@Component({
  selector: 'app-module-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelChipComponent],
  template: `
    <a
      class="card lux-card lux-press"
      [routerLink]="['/', meta().framework, meta().level, meta().slug]"
    >
      <div class="top">
        <span class="num">{{ order() }}</span>
        @if (meta().stub) {
          <span class="label-mono soon">À venir</span>
        }
      </div>
      <h3 class="h3 title">{{ meta().title }}</h3>
      <p class="desc small">{{ meta().seoDescription }}</p>
      <hr class="rule" aria-hidden="true" />
      <div class="foot">
        <app-level-chip [level]="meta().level" />
        @if (meta().duration) {
          <span class="label-mono dur tnum">{{ meta().duration }} min</span>
        }
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      padding: 24px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .num {
      font-family: var(--font-display);
      font-size: 26px;
      line-height: 1;
      background: var(--gold-metallic);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .soon {
      color: var(--gold);
      border: 1px solid var(--hairline-gold);
      border-radius: var(--radius-pill);
      padding: 3px 9px;
    }
    .title {
      color: var(--text);
      transition: color var(--dur) var(--ease-out);
    }
    .card:hover .title {
      color: var(--gold-bright);
    }
    .desc {
      color: var(--text-soft);
      flex: 1;
    }
    .rule {
      border: none;
      height: 1px;
      background: var(--border);
      margin: 2px 0;
    }
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .dur {
      color: var(--text-dim);
    }
  `,
})
export class ModuleCardComponent {
  readonly meta = input.required<ModuleMeta>();
  protected order(): string {
    return this.meta().order.toString().padStart(2, '0');
  }
}
