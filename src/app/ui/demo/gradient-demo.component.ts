import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'type', prop: 'type', options: ['linear', 'radial', 'conic'] },
  { kind: 'range', label: 'angle', prop: 'angle', min: 0, max: 360, unit: 'deg' },
  { kind: 'range', label: 'teinte 1', prop: 'h1', min: 0, max: 360 },
  { kind: 'range', label: 'teinte 2', prop: 'h2', min: 0, max: 360 },
  { kind: 'range', label: 'position 2', prop: 'stop', min: 0, max: 100, unit: '%' },
];

const INIT: Record<string, string | number> = { type: 'linear', angle: 135, h1: 270, h2: 175, stop: 100 };

@Component({
  selector: 'app-gradient-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="background"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview" [style.background]="gradient()"></div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      min-height: 240px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
  `,
})
export class GradientDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly gradient = computed<string>(() => {
    const s = this.state();
    const c1 = `hsl(${s['h1']} 80% 60%)`;
    const c2 = `hsl(${s['h2']} 80% 55%)`;
    const stop = `${c2} ${s['stop']}%`;
    if (s['type'] === 'radial') return `radial-gradient(circle at 50% 50%, ${c1}, ${stop})`;
    if (s['type'] === 'conic') return `conic-gradient(from ${s['angle']}deg at 50% 50%, ${c1}, ${c2})`;
    return `linear-gradient(${s['angle']}deg, ${c1}, ${stop})`;
  });

  protected readonly css = computed<string>(() => `.box {\n  background: ${this.gradient()};\n}`);

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
