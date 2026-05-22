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
        class="chip all"
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
      --chip: var(--text-soft);
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 6px 14px;
      background: var(--glass);
      backdrop-filter: blur(16px) saturate(1.3);
      -webkit-backdrop-filter: blur(16px) saturate(1.3);
      transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease),
        background var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
    }
    .chip:hover {
      color: var(--text);
      border-color: color-mix(in oklab, var(--accent) 40%, transparent);
    }
    .chip.active {
      color: #08070c;
      border-color: transparent;
      background: var(--chip);
      box-shadow: 0 0 0 1px var(--chip),
        0 6px 24px -8px color-mix(in oklab, var(--chip) 70%, transparent);
    }
    .chip.all.active {
      --chip: var(--accent);
      background: var(--accent);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--chip);
    }
    .chip.active .dot {
      background: #08070c;
    }
  `,
})
export class LevelFilterComponent {
  readonly selected = model<LevelFilter>('all');
  protected readonly levels = LEVELS;
  protected readonly meta = LEVEL_META;
}
