import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Mono uppercase kicker label. Usage: <app-eyebrow>Module 07</app-eyebrow> */
@Component({
  selector: 'app-eyebrow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="label-mono"><span class="tick" aria-hidden="true"></span><ng-content /></span>`,
  styles: `
    :host {
      display: block;
    }
    .label-mono {
      display: inline-flex;
      align-items: center;
      gap: 0.6em;
    }
    .tick {
      width: 14px;
      height: 3px;
      background: var(--accent);
      flex-shrink: 0;
    }
  `,
})
export class EyebrowComponent {}
