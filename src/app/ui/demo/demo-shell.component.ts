import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';

export type SelectControl = {
  readonly kind: 'select';
  readonly prop: string;
  readonly label: string;
  readonly options: readonly string[];
};
export type RangeControl = {
  readonly kind: 'range';
  readonly prop: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly unit?: string;
};
export type Control = SelectControl | RangeControl;

/**
 * Presentational chrome shared by every interactive CSS demo: a control panel
 * (selects + ranges) on the left, and a stage on the right holding the
 * projected live preview plus the generated-CSS readout. The host owns state;
 * the shell only renders controls and emits changes.
 */
@Component({
  selector: 'app-demo-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (unsupported()) {
      <div class="compat" role="status">
        <span class="compat-icon" aria-hidden="true">⚠</span>
        <span>{{ compatLabel() }} La démo reste statique ; le CSS généré ci-dessous reste correct.</span>
      </div>
    }
    <div class="demo">
      <div class="panel">
        <span class="tag">{{ tag() }}</span>
        @for (c of controls(); track c.prop) {
          <label class="ctrl">
            <span class="lbl">{{ c.label }}</span>
            @if (c.kind === 'range') {
              <span class="row">
                <input
                  type="range"
                  [min]="c.min"
                  [max]="c.max"
                  [value]="values()[c.prop]"
                  (input)="set.emit({ prop: c.prop, value: +$any($event.target).value })"
                  [attr.aria-label]="c.label"
                />
                <output class="val">{{ values()[c.prop] }}{{ c.unit ?? '' }}</output>
              </span>
            } @else {
              <select
                [value]="values()[c.prop]"
                (change)="set.emit({ prop: c.prop, value: $any($event.target).value })"
                [attr.aria-label]="c.label"
              >
                @for (o of c.options; track o) {
                  <option [value]="o" [selected]="values()[c.prop] === o">{{ o }}</option>
                }
              </select>
            }
          </label>
        }
        <div class="actions">
          <ng-content select="[actions]" />
          <button type="button" class="reset" (click)="reset.emit()">Réinitialiser</button>
        </div>
      </div>

      <div class="stage">
        <ng-content select="[preview]" />
        @if (css()) {
          <pre class="readout" aria-label="CSS généré"><code>{{ css() }}</code></pre>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .compat {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
      padding: 12px 16px;
      border-radius: var(--radius);
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--text);
      border: 1px solid color-mix(in oklab, var(--level-medior) 45%, transparent);
      background: color-mix(in oklab, var(--level-medior) 12%, transparent);
    }
    .compat-icon {
      color: var(--level-medior);
      font-size: 15px;
      line-height: 1.4;
    }
    .demo {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--glass);
      backdrop-filter: blur(20px) saturate(1.3);
      -webkit-backdrop-filter: blur(20px) saturate(1.3);
      padding: 18px;
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }
    .tag {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-2);
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-soft);
    }
    .ctrl {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lbl {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-soft);
    }
    select {
      width: 100%;
      padding: 7px 9px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text);
      background: var(--bg-inset);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    select:focus-visible {
      outline: none;
      border-color: color-mix(in oklab, var(--accent) 55%, transparent);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input[type='range'] {
      flex: 1;
      accent-color: var(--accent);
      min-width: 0;
    }
    .val {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
      min-width: 46px;
      text-align: right;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    .reset {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 6px 14px;
      background: transparent;
      cursor: pointer;
      transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
    }
    .reset:hover {
      color: var(--text);
      border-color: color-mix(in oklab, var(--accent) 40%, transparent);
    }
    .stage {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .readout {
      margin: 0;
      padding: 14px 16px;
      border-radius: var(--radius);
      background: var(--bg-inset);
      border: 1px solid var(--border);
      overflow-x: auto;
    }
    .readout code {
      font-family: var(--font-mono);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--text-soft);
      white-space: pre;
    }
    @media (max-width: 720px) {
      .demo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DemoShellComponent {
  readonly tag = input<string>('');
  readonly controls = input.required<readonly Control[]>();
  readonly values = input.required<Record<string, string | number>>();
  readonly css = input<string>('');
  /** A CSS declaration to feature-test, e.g. `animation-timeline: scroll()`. */
  readonly compatTest = input<string>('');
  /** Message shown when `compatTest` is unsupported by the current browser. */
  readonly compatLabel = input<string>('');

  readonly set = output<{ prop: string; value: string | number }>();
  readonly reset = output<void>();

  /** Stays false during SSR/hydration; set on the client to avoid flicker. */
  protected readonly unsupported = signal(false);

  constructor() {
    afterNextRender(() => {
      const test = this.compatTest();
      if (test && typeof CSS !== 'undefined' && !CSS.supports(test)) {
        this.unsupported.set(true);
      }
    });
  }
}
