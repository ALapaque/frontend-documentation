import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import { FrameworkLogoComponent } from './framework-logo.component';
import { FRAMEWORK_LABEL } from '../core/levels';
import type { ModuleMeta } from '../content/content.types';

@Component({
  selector: 'app-module-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelChipComponent, FrameworkLogoComponent],
  template: `
    <a class="card" [routerLink]="['/', meta().framework, meta().level, meta().slug]">
      <div class="top">
        @if (showFramework()) {
          <span class="fw label-mono">
            <app-framework-logo class="fwlogo" [framework]="meta().framework" />
            {{ fwLabel() }}
          </span>
        } @else {
          <span class="num label-mono">{{ order() }}</span>
        }
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
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      padding: 22px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--glass);
      backdrop-filter: blur(18px) saturate(1.3);
      -webkit-backdrop-filter: blur(18px) saturate(1.3);
      transition: transform var(--dur) var(--ease-spring),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: color-mix(in oklab, var(--accent) 42%, transparent);
      box-shadow: var(--glow);
    }
    .card:hover .title {
      color: var(--text);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .num {
      color: var(--text-dim);
    }
    .fw {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--text-soft);
      letter-spacing: 0.14em;
    }
    .fwlogo {
      width: 16px;
      height: 16px;
    }
    .soon {
      color: var(--gold-soft);
    }
    .title {
      color: var(--text);
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
  readonly showFramework = input(false);
  protected readonly fwLabel = computed(() => FRAMEWORK_LABEL[this.meta().framework]);
  protected order(): string {
    return this.meta().order.toString().padStart(2, '0');
  }
}
