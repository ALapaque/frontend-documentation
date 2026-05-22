import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';

@Component({
  selector: 'app-framework-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/', framework()]" class="card tile tile-press" [attr.data-fw]="framework()">
      <div class="head">
        <span class="mark" aria-hidden="true">{{ initial() }}</span>
        <span class="label-mono count tnum">{{ count() }} modules</span>
      </div>
      <h3 class="name">{{ label() }}</h3>
      <p class="tagline">{{ tagline() }}</p>
      <span class="go">Ouvrir le hub →</span>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      height: 100%;
      padding: 28px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 13px;
      border: 1.5px solid var(--border-strong);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 24px;
      color: #fff;
      box-shadow: var(--shadow-1);
    }
    .card[data-fw='angular'] .mark {
      background: var(--accent-2);
    }
    .card[data-fw='react'] .mark {
      background: var(--accent);
    }
    .card[data-fw='vue'] .mark {
      background: var(--level-junior);
    }
    .count {
      color: var(--text-dim);
    }
    .name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 30px;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .tagline {
      color: var(--text-soft);
      flex: 1;
      line-height: 1.5;
    }
    .go {
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 500;
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
  protected initial(): string {
    return FRAMEWORK_LABEL[this.framework()].charAt(0);
  }
}
