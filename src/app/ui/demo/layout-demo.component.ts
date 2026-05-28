import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const FLEX_CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'flex-direction', prop: 'flex-direction', options: ['row', 'row-reverse', 'column', 'column-reverse'] },
  {
    kind: 'select',
    label: 'justify-content',
    prop: 'justify-content',
    options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  },
  { kind: 'select', label: 'align-items', prop: 'align-items', options: ['stretch', 'flex-start', 'center', 'flex-end'] },
  { kind: 'select', label: 'flex-wrap', prop: 'flex-wrap', options: ['nowrap', 'wrap'] },
  { kind: 'range', label: 'gap', prop: 'gap', min: 0, max: 32, unit: 'px' },
];

const GRID_CONTROLS: readonly Control[] = [
  { kind: 'range', label: 'colonnes', prop: 'columns', min: 1, max: 6 },
  { kind: 'range', label: 'gap', prop: 'gap', min: 0, max: 32, unit: 'px' },
  { kind: 'select', label: 'justify-items', prop: 'justify-items', options: ['stretch', 'start', 'center', 'end'] },
  { kind: 'select', label: 'align-items', prop: 'align-items', options: ['stretch', 'start', 'center', 'end'] },
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

@Component({
  selector: 'app-layout-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      [tag]="kind() === 'flexbox' ? 'display: flex' : 'display: grid'"
      [controls]="controls()"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview" [class.grid]="kind() === 'grid'" [style]="containerStyle()">
        @for (n of items(); track n) {
          <div class="box">{{ n }}</div>
        }
      </div>
    </app-demo-shell>
  `,
  styles: `
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
      color: #fff;
      background: var(--grad);
      box-shadow: 0 6px 20px -8px color-mix(in oklab, var(--accent) 70%, transparent);
    }
  `,
})
export class LayoutDemoComponent {
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
    const body = Object.entries(this.containerStyle())
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    return `.container {\n${body}\n}`;
  });

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
