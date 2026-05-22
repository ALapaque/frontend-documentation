import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LEVEL_META, type Level } from '../core/levels';

/** Colored level indicator. Usage: <app-level-chip level="medior" /> */
@Component({
  selector: 'app-level-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [style.--chip]="meta().colorVar">
      <span class="dot" aria-hidden="true"></span>
      {{ meta().label }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--chip);
      border: 1.5px solid var(--chip);
      background: color-mix(in oklab, var(--chip) 12%, #fff);
      border-radius: var(--radius-pill);
      padding: 4px 10px;
      white-space: nowrap;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--chip);
    }
  `,
})
export class LevelChipComponent {
  readonly level = input.required<Level>();
  protected readonly meta = computed(() => LEVEL_META[this.level()]);
}
