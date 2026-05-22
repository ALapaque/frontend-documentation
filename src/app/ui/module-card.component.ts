import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import type { ModuleMeta } from '../content/content.types';

@Component({
  selector: 'app-module-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelChipComponent],
  template: `
    <a class="card" [routerLink]="['/', meta().framework, meta().level, meta().slug]">
      <div class="top">
        <span class="num label-mono">{{ order() }}</span>
        @if (meta().stub) {
          <span class="label-mono soon">À venir</span>
        }
      </div>
      <h3 class="h3 title">{{ meta().title }}</h3>
      <p class="desc small">{{ meta().seoDescription }}</p>
      <div class="foot">
        <app-level-chip [level]="meta().level" />
        @if (meta().duration) {
          <span class="label-mono dur">{{ meta().duration }} min</span>
        }
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      padding: 22px;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      box-shadow: var(--shadow-1);
      overflow: hidden;
      transition: transform var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--hairline-top);
      opacity: 0.5;
      pointer-events: none;
    }
    /* gold wash that fades in on hover */
    .card::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        80% 60% at 50% -10%,
        color-mix(in oklab, var(--gold) 9%, transparent),
        transparent 70%
      );
      opacity: 0;
      transition: opacity var(--dur) var(--ease-out);
      pointer-events: none;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: color-mix(in oklab, var(--gold) 40%, var(--border));
      box-shadow: var(--shadow-2);
    }
    .card:hover::after {
      opacity: 1;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .num {
      color: var(--text-dim);
    }
    .soon {
      color: var(--gold-soft);
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
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
