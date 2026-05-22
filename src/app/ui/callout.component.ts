import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CalloutType = 'info' | 'tip' | 'warn';

interface CalloutStyle {
  readonly colorVar: string;
  readonly label: string;
}

const STYLES: Record<CalloutType, CalloutStyle> = {
  info: { colorVar: 'var(--sky)', label: 'Info' },
  tip: { colorVar: 'var(--sage)', label: 'Astuce' },
  warn: { colorVar: 'var(--crimson)', label: 'Attention' },
};

/** Editorial aside. Usage: <app-callout type="tip">…</app-callout> */
@Component({
  selector: 'app-callout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="callout" [style.--accent]="style().colorVar" role="note">
      <span class="label-mono tag">{{ style().label }}</span>
      <div class="body"><ng-content /></div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }
    .callout {
      border: 1px solid color-mix(in oklab, var(--accent) 30%, var(--border));
      border-left: 2px solid var(--accent);
      background: color-mix(in oklab, var(--accent) 5%, var(--bg-card));
      border-radius: var(--radius);
      padding: 16px 18px;
    }
    .tag {
      color: var(--accent);
      margin-bottom: 8px;
    }
    .body {
      color: var(--text);
      line-height: 1.6;
    }
    .body ::ng-deep > *:first-child {
      margin-top: 0;
    }
    .body ::ng-deep > *:last-child {
      margin-bottom: 0;
    }
  `,
})
export class CalloutComponent {
  readonly type = input<CalloutType>('info');
  protected readonly style = computed(() => STYLES[this.type()]);
}
