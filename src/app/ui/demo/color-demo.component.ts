import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'range', label: 'lightness (%)', prop: 'l', min: 0, max: 100 },
  { kind: 'range', label: 'chroma (×100)', prop: 'c', min: 0, max: 37 },
  { kind: 'range', label: 'hue', prop: 'h', min: 0, max: 360 },
  { kind: 'range', label: 'mélange blanc (%)', prop: 'mix', min: 0, max: 100 },
];

const INIT: Record<string, string | number> = { l: 64, c: 19, h: 280, mix: 30 };

@Component({
  selector: 'app-color-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="oklch()"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      compatTest="color: oklch(0% 0 0)"
      compatLabel="oklch() et color-mix() nécessitent Chrome 111+, Safari 16.4+ ou Firefox 113+."
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <div class="swatch base" [style.background]="base()">
          <span>oklch</span>
        </div>
        <div class="swatch" [style.background]="mixed()">
          <span>color-mix</span>
        </div>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      min-height: 200px;
      padding: 14px;
      border-radius: var(--radius);
      border: 1px dashed var(--border-strong);
    }
    .swatch {
      display: grid;
      place-items: end start;
      padding: 12px;
      border-radius: var(--radius);
      min-height: 160px;
    }
    .swatch span {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #000;
      background: color-mix(in oklab, #fff 70%, transparent);
      padding: 2px 8px;
      border-radius: 999px;
    }
  `,
})
export class ColorDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly base = computed<string>(() => {
    const s = this.state();
    return `oklch(${s['l']}% ${Number(s['c']) / 100} ${s['h']})`;
  });
  protected readonly mixed = computed<string>(
    () => `color-mix(in oklab, ${this.base()}, white ${this.state()['mix']}%)`,
  );

  protected readonly css = computed<string>(
    () => `.swatch {\n  background: ${this.base()};\n}\n.tint {\n  background: ${this.mixed()};\n}`,
  );

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
