import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';

@Component({
  selector: 'app-framework-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/', framework()]" class="card lux-card lux-press" [attr.data-fw]="framework()">
      <span class="mark" aria-hidden="true">{{ initial() }}</span>
      <h3 class="name">{{ label() }}</h3>
      <p class="tagline">{{ tagline() }}</p>
      <div class="foot">
        <span class="label-mono count tnum">{{ count() }} modules</span>
        <span class="go" aria-hidden="true">→</span>
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
      gap: 16px;
      height: 100%;
      padding: 30px;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      font-family: var(--font-display);
      font-size: 24px;
      color: var(--bg);
      background: var(--gold-metallic);
      box-shadow: 0 0 0 1px var(--hairline-gold),
        0 10px 30px -10px color-mix(in oklab, var(--gold) 50%, transparent);
      transition: transform var(--dur) var(--ease-spring);
    }
    .card[data-fw='angular'] .mark {
      background: linear-gradient(135deg, #d9a59c, #b86f6f);
      color: #fff;
    }
    .card[data-fw='react'] .mark {
      background: linear-gradient(135deg, #a7c3d4, #88a6bc);
      color: #10171c;
    }
    .card[data-fw='vue'] .mark {
      background: linear-gradient(135deg, #b6c9b2, #93a98f);
      color: #11160f;
    }
    .card:hover .mark {
      transform: rotate(-6deg) scale(1.06);
    }
    .name {
      font-family: var(--font-display);
      font-size: 30px;
      letter-spacing: -0.015em;
      color: var(--text);
    }
    .tagline {
      color: var(--text-soft);
      flex: 1;
      line-height: 1.5;
    }
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .count {
      color: var(--text-dim);
    }
    .go {
      font-size: 20px;
      color: var(--gold);
      transition: transform var(--dur) var(--ease-out);
    }
    .card:hover .go {
      transform: translateX(5px);
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
