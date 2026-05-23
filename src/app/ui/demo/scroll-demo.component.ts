import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DemoShellComponent, type Control } from './demo-shell.component';

const CONTROLS: readonly Control[] = [
  { kind: 'select', label: 'effet', prop: 'effect', options: ['fade', 'slide', 'scale', 'rotate'] },
];

const SNIPPET: Record<string, string> = {
  fade: 'from { opacity: .1 }   to { opacity: 1 }',
  slide: 'from { translate: -40px } to { translate: 0 }',
  scale: 'from { scale: .6 }    to { scale: 1 }',
  rotate: 'from { rotate: -12deg } to { rotate: 0 }',
};

@Component({
  selector: 'app-scroll-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoShellComponent],
  template: `
    <app-demo-shell
      tag="animation-timeline: scroll()"
      [controls]="controls"
      [values]="state()"
      [css]="css()"
      compatTest="animation-timeline: scroll()"
      compatLabel="Les scroll-driven animations nécessitent un navigateur Chromium 115+ (Chrome / Edge) ; Safari et Firefox stables ne les supportent pas encore."
      (set)="set($event)"
      (reset)="reset()"
    >
      <div preview class="preview">
        <div class="scroller" data-lenis-prevent>
          <div
            class="target"
            [class.fade]="effect() === 'fade'"
            [class.slide]="effect() === 'slide'"
            [class.scale]="effect() === 'scale'"
            [class.rotate]="effect() === 'rotate'"
          >
            scroll ↓
          </div>
          <div class="filler"></div>
        </div>
        <p class="hint">Scrolle à l'intérieur du cadre — l'élément s'anime selon la progression.</p>
      </div>
    </app-demo-shell>
  `,
  styles: `
    .preview {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: var(--radius);
      border: 1px dashed var(--border-strong);
    }
    .scroller {
      height: 220px;
      overflow-y: auto;
      overscroll-behavior: contain;
      border-radius: var(--radius-sm);
      background: var(--bg-inset);
      scroll-timeline: --sc block;
    }
    .target {
      position: sticky;
      top: 14px;
      width: 120px;
      height: 64px;
      margin: 14px auto;
      display: grid;
      place-items: center;
      border-radius: 12px;
      font-family: var(--font-mono);
      font-weight: 600;
      color: #08070c;
      background: var(--grad);
      box-shadow: 0 10px 30px -10px color-mix(in oklab, var(--accent) 70%, transparent);
    }
    .filler {
      height: 520px;
    }
    .hint {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
    }
    @supports (animation-timeline: scroll()) {
      .target {
        animation-timeline: --sc;
        animation-duration: auto;
        animation-fill-mode: both;
        animation-timing-function: linear;
      }
      .target.fade {
        animation-name: sc-fade;
      }
      .target.slide {
        animation-name: sc-slide;
      }
      .target.scale {
        animation-name: sc-scale;
      }
      .target.rotate {
        animation-name: sc-rotate;
      }
    }
    @keyframes sc-fade {
      from { opacity: 0.1; }
      to { opacity: 1; }
    }
    @keyframes sc-slide {
      from { translate: -40px 0; }
      to { translate: 0 0; }
    }
    @keyframes sc-scale {
      from { scale: 0.6; }
      to { scale: 1; }
    }
    @keyframes sc-rotate {
      from { rotate: -12deg; }
      to { rotate: 0deg; }
    }
  `,
})
export class ScrollDemoComponent {
  protected readonly controls = CONTROLS;
  private readonly overrides = signal<Record<string, string | number>>({});
  protected readonly state = computed(() => ({ effect: 'fade', ...this.overrides() }));
  protected readonly effect = computed(() => String(this.state()['effect']));

  protected readonly css = computed<string>(
    () =>
      `.scroller { scroll-timeline: --sc block; }\n.target {\n  animation: ${this.effect()} auto linear;\n  animation-timeline: --sc;\n}\n@keyframes ${this.effect()} {\n  ${SNIPPET[this.effect()]}\n}`,
  );

  protected set(e: { prop: string; value: string | number }): void {
    this.overrides.update((o) => ({ ...o, [e.prop]: e.value }));
  }
  protected reset(): void {
    this.overrides.set({});
  }
}
