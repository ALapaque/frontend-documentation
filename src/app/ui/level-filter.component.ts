import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { LEVEL_META, LEVELS, type Level } from '../core/levels';

export type LevelFilter = Level | 'all';

/** Toggleable level chips. Two-way bound via `selected`. Presentational only —
 *  the host owns persistence. */
@Component({
  selector: 'app-level-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter" role="group" aria-label="Filtrer par niveau">
      <button
        type="button"
        class="chip"
        [class.active]="selected() === 'all'"
        [attr.aria-pressed]="selected() === 'all'"
        (click)="selected.set('all')"
      >
        Tous
      </button>
      @for (lvl of levels; track lvl) {
        <button
          type="button"
          class="chip"
          [style.--chip]="meta[lvl].colorVar"
          [class.active]="selected() === lvl"
          [attr.aria-pressed]="selected() === lvl"
          (click)="selected.set(lvl)"
        >
          <span class="dot" aria-hidden="true"></span>
          {{ meta[lvl].label }}
        </button>
      }
    </div>
  `,
  styles: `
    .filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      --chip: var(--ink);
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink);
      background: var(--bg-card);
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-pill);
      padding: 6px 14px;
      box-shadow: var(--shadow-1);
      transition: color var(--dur) var(--ease-out), background var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .chip:hover {
      transform: translate(-1px, -1px);
      box-shadow: var(--shadow-2);
    }
    .chip.active {
      color: #fff;
      background: var(--chip);
      box-shadow: var(--shadow-1);
    }
    .chip.active:hover {
      box-shadow: var(--shadow-2);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--chip);
    }
    .chip.active .dot {
      background: #fff;
    }
  `,
})
export class LevelFilterComponent {
  readonly selected = model<LevelFilter>('all');
  protected readonly levels = LEVELS;
  protected readonly meta = LEVEL_META;
}
