import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Mono uppercase kicker label. Usage: <app-eyebrow>Module 07</app-eyebrow> */
@Component({
  selector: 'app-eyebrow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="label-mono"><ng-content /></span>`,
  styles: `
    :host {
      display: block;
    }
    .label-mono {
      display: inline-flex;
      align-items: center;
      gap: 0.6em;
    }
  `,
})
export class EyebrowComponent {}
