import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'range', label: 'valeur', prop: 'value', min: 1, max: 100 },
  { kind: 'select', label: 'unité', prop: 'unit', options: ['px', '%', 'rem', 'em', 'vw', 'ch'] },
];

const INIT: Record<string, string | number> = { value: 50, unit: '%' };

const NOTE: Record<string, string> = {
  px: 'pixels absolus — indépendants du contexte',
  '%': 'relatif à la largeur du conteneur (320px ici)',
  rem: "relatif à la racine (1rem = 16px)",
  em: "relatif au font-size du parent (16px ici)",
  vw: 'relatif à la largeur du viewport',
  ch: "largeur du caractère « 0 » de la police",
};

@Component({
  selector: 'app-units-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="width"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <div class="track">
          <div class="bar" [style.width]="widthValue()">{{ widthValue() }}</div>
        </div>
        <p class="note">{{ note() }}</p>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 160px;
      padding: 20px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .track {
      width: 320px;
      max-width: 100%;
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-inset);
    }
    .bar {
      max-width: 100%;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--bg);
      background: var(--grad);
      white-space: nowrap;
      overflow: hidden;
    }
    .note {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
      margin: 0;
    }
  `,
})
export class UnitsDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ ...INIT, ...this.overrides() }));

  protected readonly widthValue = computed(() => `${this.state()['value']}${this.state()['unit']}`);
  protected readonly note = computed(() => NOTE[String(this.state()['unit'])] ?? '');
  protected readonly css = computed(() => `.box {\n  width: ${this.widthValue()};\n}`);

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
