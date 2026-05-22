import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';

@Component({
  selector: 'app-framework-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/', framework()]" class="card">
      <span class="mark" [attr.data-fw]="framework()" aria-hidden="true"></span>
      <h3 class="name">{{ label() }}</h3>
      <p class="small tagline">{{ tagline() }}</p>
      <div class="foot">
        <span class="label-mono count">{{ count() }} modules</span>
        <span class="label-mono go">Ouvrir →</span>
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
      padding: 28px;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      transition: transform var(--dur) var(--ease), border-color var(--dur) var(--ease);
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--gold-soft);
    }
    .mark {
      width: 30px;
      height: 30px;
      border-radius: 8px;
    }
    .mark[data-fw='angular'] {
      background: linear-gradient(135deg, #b86f6f, #d49b8a);
    }
    .mark[data-fw='react'] {
      background: linear-gradient(135deg, #7fa3b8, #8fa68e);
    }
    .mark[data-fw='vue'] {
      background: linear-gradient(135deg, #8fa68e, #c9a876);
    }
    .name {
      font-family: var(--font-display);
      font-size: 26px;
    }
    .tagline {
      color: var(--text-soft);
      flex: 1;
    }
    .foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .count {
      color: var(--text-dim);
    }
    .go {
      color: var(--gold);
    }
  `,
})
export class FrameworkCardComponent {
  readonly framework = input.required<Framework>();
  readonly tagline = input.required<string>();
  readonly count = input.required<number>();
  protected label(): string {
    return FRAMEWORK_LABEL[this.framework()];
  }
}
