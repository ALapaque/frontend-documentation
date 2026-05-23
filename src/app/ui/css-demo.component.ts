import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

type CtrlSelect = { readonly prop: string; readonly options: readonly string[] };
type CtrlRange = { readonly prop: string; readonly min: number; readonly max: number };
type Control = (CtrlSelect | { range: true } & CtrlRange) & { readonly label: string };

const FLEX_CONTROLS: readonly Control[] = [
  { label: 'flex-direction', prop: 'flex-direction', options: ['row', 'row-reverse', 'column', 'column-reverse'] },
  {
    label: 'justify-content',
    prop: 'justify-content',
    options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  },
  { label: 'align-items', prop: 'align-items', options: ['stretch', 'flex-start', 'center', 'flex-end'] },
  { label: 'flex-wrap', prop: 'flex-wrap', options: ['nowrap', 'wrap'] },
  { label: 'gap', prop: 'gap', range: true, min: 0, max: 32 },
];

const GRID_CONTROLS: readonly Control[] = [
  { label: 'colonnes', prop: 'columns', range: true, min: 1, max: 6 },
  { label: 'gap', prop: 'gap', range: true, min: 0, max: 32 },
  { label: 'justify-items', prop: 'justify-items', options: ['stretch', 'start', 'center', 'end'] },
  { label: 'align-items', prop: 'align-items', options: ['stretch', 'start', 'center', 'end'] },
];

const FLEX_INIT: Record<string, string | number> = {
  'flex-direction': 'row',
  'justify-content': 'flex-start',
  'align-items': 'stretch',
  'flex-wrap': 'nowrap',
  gap: 12,
};

const GRID_INIT: Record<string, string | number> = {
  columns: 3,
  gap: 12,
  'justify-items': 'stretch',
  'align-items': 'stretch',
};

/**
 * Live, interactive CSS playground for flexbox/grid. Controls drive real
 * style bindings on the preview boxes and a generated-CSS readout, so the
 * reader changes a property and sees the layout rearrange instantly.
 */
@Component({
  selector: 'app-css-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo">
      <div class="panel">
        <span class="tag">{{ kind() === 'flexbox' ? 'display: flex' : 'display: grid' }}</span>
        @for (c of controls(); track c.prop) {
          <label class="ctrl">
            <span class="lbl">{{ c.label }}</span>
            @if (isRange(c)) {
              <span class="row">
                <input
                  type="range"
                  [min]="c.min"
                  [max]="c.max"
                  [value]="state()[c.prop]"
                  (input)="set(c.prop, +$any($event.target).value)"
                  [attr.aria-label]="c.label"
                />
                <output class="val">{{ state()[c.prop] }}{{ c.prop === 'columns' ? '' : 'px' }}</output>
              </span>
            } @else {
              <select
                [value]="state()[c.prop]"
                (change)="set(c.prop, $any($event.target).value)"
                [attr.aria-label]="c.label"
              >
                @for (o of asSelect(c).options; track o) {
                  <option [value]="o" [selected]="state()[c.prop] === o">{{ o }}</option>
                }
              </select>
            }
          </label>
        }
        <button type="button" class="reset" (click)="reset()">Réinitialiser</button>
      </div>

      <div class="stage">
        <div class="preview" [class.grid]="kind() === 'grid'" [style]="containerStyle()">
          @for (n of items(); track n) {
            <div class="box">{{ n }}</div>
          }
        </div>
        <pre class="readout" aria-label="CSS généré"><code>{{ css() }}</code></pre>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
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
      min-width: 40px;
      text-align: right;
    }
    .reset {
      margin-top: 4px;
      align-self: flex-start;
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
    .preview {
      min-height: 220px;
      padding: 14px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .preview.grid {
      grid-auto-rows: 64px;
    }
    .box {
      display: grid;
      place-items: center;
      min-width: 52px;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-weight: 600;
      color: #08070c;
      background: var(--grad);
      box-shadow: 0 6px 20px -8px color-mix(in oklab, var(--accent) 70%, transparent);
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
export class CssDemoComponent {
  readonly kind = input.required<'flexbox' | 'grid'>();

  private readonly overrides = signal<Record<string, string | number>>({});

  protected readonly state = computed<Record<string, string | number>>(() => ({
    ...(this.kind() === 'grid' ? GRID_INIT : FLEX_INIT),
    ...this.overrides(),
  }));

  protected readonly controls = computed(() =>
    this.kind() === 'grid' ? GRID_CONTROLS : FLEX_CONTROLS,
  );

  protected readonly items = computed(() => {
    const n = this.kind() === 'grid' ? 6 : 5;
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  protected readonly containerStyle = computed<Record<string, string>>(() => {
    const s = this.state();
    const style: Record<string, string> = {};
    if (this.kind() === 'grid') {
      style['display'] = 'grid';
      style['grid-template-columns'] = `repeat(${s['columns']}, 1fr)`;
      style['gap'] = `${s['gap']}px`;
      style['justify-items'] = String(s['justify-items']);
      style['align-items'] = String(s['align-items']);
    } else {
      style['display'] = 'flex';
      style['flex-direction'] = String(s['flex-direction']);
      style['justify-content'] = String(s['justify-content']);
      style['align-items'] = String(s['align-items']);
      style['flex-wrap'] = String(s['flex-wrap']);
      style['gap'] = `${s['gap']}px`;
    }
    return style;
  });

  protected readonly css = computed<string>(() => {
    const s = this.containerStyle();
    const body = Object.entries(s)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    return `.container {\n${body}\n}`;
  });

  protected set(prop: string, value: string | number): void {
    this.overrides.update((o) => ({ ...o, [prop]: value }));
  }

  protected reset(): void {
    this.overrides.set({});
  }

  protected isRange(c: Control): c is { range: true } & CtrlRange & { label: string } {
    return 'range' in c;
  }
  protected asSelect(c: Control): CtrlSelect & { label: string } {
    return c as CtrlSelect & { label: string };
  }
}
