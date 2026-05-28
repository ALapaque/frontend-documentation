import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'property', prop: 'property', options: ['all', 'transform', 'background-color', 'opacity', 'border-radius'] },
  { kind: 'range', label: 'duration', prop: 'duration', min: 0, max: 1500, unit: 'ms' },
  {
    kind: 'select',
    label: 'timing-function',
    prop: 'timing',
    options: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(.34,1.56,.64,1)'],
  },
  { kind: 'range', label: 'delay', prop: 'delay', min: 0, max: 600, unit: 'ms' },
];

const INIT: Record<string, string | number> = {
  property: 'all',
  duration: 400,
  timing: 'ease',
  delay: 0,
};

@Component({
  selector: 'app-transition-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="transition"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <button actions type="button" class="play" (click)="toggle()">
        {{ active() ? 'Revenir' : 'Lancer' }}
      </button>
      <div preview class="preview">
        <div class="box" [class.active]="active()" [style.transition]="transition()">●</div>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .play {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fff;
      background: var(--grad);
      border: none;
      border-radius: var(--radius-pill);
      padding: 6px 16px;
      cursor: pointer;
    }
    .preview {
      display: grid;
      place-items: center start;
      min-height: 200px;
      padding: 24px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .box {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: 12px;
      font-size: 22px;
      color: #fff;
      background: var(--accent-2);
    }
    .box.active {
      transform: translateX(min(60vw, 320px)) scale(1.25) rotate(180deg);
      background: var(--accent);
      opacity: 0.85;
      border-radius: 50%;
    }
  `,
})
export class TransitionDemoComponent {
  protected readonly controls = CONTROLS;
  protected readonly active = signal(false);
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly transition = computed<string>(() => {
    const s = this.state();
    return `${s['property']} ${s['duration']}ms ${s['timing']} ${s['delay']}ms`;
  });

  protected readonly css = computed<string>(
    () => `.box {\n  transition: ${this.transition()};\n}`,
  );

  protected toggle(): void {
    this.active.update((v) => !v);
  }
  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
    this.active.set(false);
  }
}
