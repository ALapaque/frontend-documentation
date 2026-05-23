import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'range', label: 'translateX', prop: 'tx', min: -80, max: 80, unit: 'px' },
  { kind: 'range', label: 'translateY', prop: 'ty', min: -60, max: 60, unit: 'px' },
  { kind: 'range', label: 'rotate', prop: 'rotate', min: -180, max: 180, unit: 'deg' },
  { kind: 'range', label: 'scale (%)', prop: 'scale', min: 40, max: 160, unit: '%' },
  { kind: 'range', label: 'skewX', prop: 'skew', min: -40, max: 40, unit: 'deg' },
];

const INIT: Record<string, string | number> = { tx: 0, ty: 0, rotate: 0, scale: 100, skew: 0 };

@Component({
  selector: 'app-transform-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="transform"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <div class="ghost"></div>
        <div class="box" [style.transform]="transform()">T</div>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 240px;
      padding: 14px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .ghost,
    .box {
      grid-area: 1 / 1;
      width: 84px;
      height: 84px;
      border-radius: var(--radius-sm);
    }
    .ghost {
      border: 1px dashed color-mix(in oklab, var(--text) 25%, transparent);
    }
    .box {
      display: grid;
      place-items: center;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 20px;
      color: #08070c;
      background: var(--grad);
      box-shadow: 0 10px 30px -10px color-mix(in oklab, var(--accent) 70%, transparent);
      transition: transform 0.12s var(--ease-out);
    }
  `,
})
export class TransformDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly transform = computed<string>(() => {
    const s = this.state();
    return `translate(${s['tx']}px, ${s['ty']}px) rotate(${s['rotate']}deg) scale(${Number(s['scale']) / 100}) skewX(${s['skew']}deg)`;
  });

  protected readonly css = computed<string>(() => `.box {\n  transform: ${this.transform()};\n}`);

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
