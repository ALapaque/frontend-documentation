import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CalloutType = 'info' | 'tip' | 'warn';

interface CalloutStyle {
  readonly colorVar: string;
  readonly label: string;
}

const STYLES: Record<CalloutType, CalloutStyle> = {
  info: { colorVar: 'var(--accent)', label: 'Info' },
  tip: { colorVar: 'var(--level-junior)', label: 'Astuce' },
  warn: { colorVar: 'var(--accent-2)', label: 'Attention' },
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
      position: relative;
      border: 1.5px solid var(--border-strong);
      background: color-mix(in oklab, var(--accent) 8%, #fff);
      border-radius: var(--radius);
      padding: 16px 18px 16px 20px;
      box-shadow: var(--shadow-1);
      overflow: hidden;
    }
    .callout::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: var(--accent);
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .tag::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
    }
    .body {
      color: var(--text-soft);
      line-height: 1.65;
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
