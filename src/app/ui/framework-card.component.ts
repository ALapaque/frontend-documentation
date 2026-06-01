import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';
import { FrameworkLogoComponent } from './framework-logo.component';
import { MorphService } from '../core/morph.service';

@Component({
  selector: 'app-framework-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrameworkLogoComponent],
  template: `
    <a
      [routerLink]="['/', framework()]"
      class="card"
      [style.view-transition-name]="morph.activeKey() === key() ? 'section-hero' : null"
      (click)="morph.activeKey.set(key())"
    >
      <app-framework-logo class="mark" [framework]="framework()" />
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
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--glass);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      box-shadow: var(--hi-edge), var(--shadow-1);
      overflow: hidden;
      transition: transform var(--dur) var(--ease-spring),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    /* aurora wash that blooms on hover */
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        70% 60% at 50% 0%,
        color-mix(in oklab, var(--accent) 22%, transparent),
        transparent 70%
      );
      opacity: 0;
      transition: opacity var(--dur) var(--ease-out);
      pointer-events: none;
    }
    .card:hover {
      transform: translateY(-6px);
      border-color: var(--accent);
      box-shadow: var(--hi-edge), var(--shadow-2), var(--glow);
    }
    .card:hover::before {
      opacity: 1;
    }
    .card:hover .go {
      transform: translateX(5px);
    }
    .mark {
      width: 40px;
      height: 40px;
      filter: drop-shadow(0 4px 16px color-mix(in oklab, var(--accent) 40%, transparent));
    }
    .name {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.02em;
      font-size: 27px;
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
      color: var(--accent-2);
      transition: transform var(--dur) var(--ease-out);
    }
  `,
})
export class FrameworkCardComponent {
  protected readonly morph = inject(MorphService);
  readonly framework = input.required<Framework>();
  readonly tagline = input.required<string>();
  readonly count = input.required<number>();
  protected readonly key = computed(() => `section-${this.framework()}`);
  protected label(): string {
    return FRAMEWORK_LABEL[this.framework()];
  }
}
