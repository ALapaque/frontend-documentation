import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import type { ModuleMeta } from '../content/content.types';

@Component({
  selector: 'app-module-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelChipComponent],
  template: `
    <a class="card tile tile-press" [routerLink]="['/', meta().framework, meta().level, meta().slug]">
      <div class="top">
        <span class="num label-mono tnum">{{ order() }}</span>
        @if (meta().stub) {
          <span class="label-mono soon">À venir</span>
        }
      </div>
      <h3 class="h3 title">{{ meta().title }}</h3>
      <p class="desc small">{{ meta().seoDescription }}</p>
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
      gap: 10px;
      height: 100%;
      padding: 22px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .num {
      color: var(--accent);
      font-weight: 700;
      font-size: 13px;
    }
    .soon {
      color: #fff;
      background: var(--accent-2);
      padding: 3px 8px;
      border-radius: var(--radius-pill);
      letter-spacing: 0.1em;
    }
    .title {
      color: var(--ink);
    }
    .desc {
      color: var(--text-soft);
      flex: 1;
    }
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 4px;
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
