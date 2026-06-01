import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'position', prop: 'position', options: ['static', 'relative', 'absolute', 'sticky'] },
  { kind: 'range', label: 'top', prop: 'top', min: 0, max: 80, unit: 'px' },
  { kind: 'range', label: 'left', prop: 'left', min: 0, max: 160, unit: 'px' },
  { kind: 'range', label: 'z-index', prop: 'z-index', min: 0, max: 5 },
];

const INIT: Record<string, string | number> = { position: 'static', top: 0, left: 0, 'z-index': 1 };

@Component({
  selector: 'app-position-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="position"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <div class="flow">A</div>
        <div class="flow target" [style]="targetStyle()">B</div>
        <div class="flow">C</div>
        <div class="flow">D</div>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      min-height: 220px;
      padding: 14px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .flow {
      display: grid;
      place-items: center;
      width: 60px;
      height: 60px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-soft);
      background: color-mix(in oklab, var(--text) 8%, transparent);
      border: 1px solid var(--border);
    }
    .target {
      color: var(--bg);
      background: var(--grad);
      border: none;
      box-shadow: 0 6px 20px -8px color-mix(in oklab, var(--accent) 70%, transparent);
    }
  `,
})
export class PositionDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly targetStyle = computed<Record<string, string>>(() => {
    const s = this.state();
    return {
      position: String(s['position']),
      top: `${s['top']}px`,
      left: `${s['left']}px`,
      'z-index': String(s['z-index']),
    };
  });

  protected readonly css = computed<string>(() => {
    const s = this.state();
    return `.box {\n  position: ${s['position']};\n  top: ${s['top']}px;\n  left: ${s['left']}px;\n  z-index: ${s['z-index']};\n}`;
  });

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
