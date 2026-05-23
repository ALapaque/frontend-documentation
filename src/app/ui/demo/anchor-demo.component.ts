import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  {
    kind: 'select',
    label: 'position-area',
    prop: 'area',
    options: ['top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'],
  },
];

@Component({
  selector: 'app-anchor-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="position-area"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      compatTest="anchor-name: --a"
      compatLabel="L'anchor positioning nécessite Chromium 125+ ; Safari et Firefox stables ne le supportent pas encore."
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <button type="button" class="anchor">ancre</button>
        <div class="tip" [style]="tipStyle()">tooltip</div>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 240px;
      padding: 40px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .anchor {
      anchor-name: --demo-anchor;
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-weight: 600;
      color: #08070c;
      background: var(--accent-2);
      border: none;
    }
    .tip {
      width: max-content;
      padding: 6px 12px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: #08070c;
      background: var(--grad);
      box-shadow: 0 8px 24px -8px color-mix(in oklab, var(--accent) 70%, transparent);
    }
  `,
})
export class AnchorDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ area: 'top', ...this.overrides() }));

  protected readonly tipStyle = computed<Record<string, string>>(() => ({
    position: 'absolute',
    'position-anchor': '--demo-anchor',
    'position-area': String(this.state()['area']),
    margin: '8px',
  }));

  protected readonly css = computed<string>(
    () =>
      `.anchor {\n  anchor-name: --tip;\n}\n.tooltip {\n  position: absolute;\n  position-anchor: --tip;\n  position-area: ${this.state()['area']};\n}`,
  );

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
