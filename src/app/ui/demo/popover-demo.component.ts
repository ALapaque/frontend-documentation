import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'popover', prop: 'type', options: ['auto', 'manual'] },
];

@Component({
  selector: 'app-popover-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="Popover API + dialog"
      [controls]="controls"
      [values]="state()"
      [css]="markup()"
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <button type="button" class="btn" popovertarget="demo-pop" popovertargetaction="toggle">
          Ouvrir le popover
        </button>
        <div id="demo-pop" class="pop" [attr.popover]="type()">
          <p>Popover natif — top-layer, sans z-index.</p>
          @if (type() === 'manual') {
            <button type="button" class="btn small" popovertarget="demo-pop" popovertargetaction="hide">
              Fermer
            </button>
          } @else {
            <small>Clic extérieur ou Échap pour fermer.</small>
          }
        </div>

        <button type="button" class="btn ghost" (click)="dlg.showModal()">Ouvrir le dialog</button>
        <dialog #dlg class="dlg" closedby="any">
          <p>&lt;dialog&gt; modal — focus piégé, fond inerte.</p>
          <form method="dialog">
            <button class="btn small">OK</button>
          </form>
        </dialog>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      min-height: 200px;
      padding: 24px;
      border-radius: var(--radius);
      background:
        linear-gradient(color-mix(in oklab, var(--accent) 5%, transparent), transparent),
        repeating-linear-gradient(45deg, transparent, transparent 9px, color-mix(in oklab, var(--border) 50%, transparent) 9px, color-mix(in oklab, var(--border) 50%, transparent) 10px);
      border: 1px dashed var(--border-strong);
    }
    .btn {
      padding: 10px 18px;
      border-radius: var(--radius-pill);
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      background: var(--grad);
      border: none;
      cursor: pointer;
    }
    .btn.ghost {
      color: var(--text);
      background: transparent;
      border: 1px solid var(--border-strong);
    }
    .btn.small {
      padding: 6px 14px;
      font-size: 12px;
    }
    .pop {
      max-width: 280px;
      margin: auto;
      padding: 18px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--bg-inset);
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pop small {
      color: var(--text-dim);
    }
    .dlg {
      max-width: 320px;
      padding: 22px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--bg-inset);
      color: var(--text);
    }
    .dlg::backdrop {
      background: color-mix(in oklab, #000 55%, transparent);
      backdrop-filter: blur(2px);
    }
    .dlg p {
      margin: 0 0 14px;
    }
  `,
})
export class PopoverDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ type: 'auto', ...this.overrides() }));
  protected readonly type = computed(() => String(this.state()['type']));

  protected readonly markup = computed<string>(
    () =>
      `<button popovertarget="tip">Ouvrir</button>\n<div id="tip" popover="${this.type()}">…</div>\n\n<button commandfor="d" command="show-modal">Dialog</button>\n<dialog id="d" closedby="any">…</dialog>`,
  );

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
