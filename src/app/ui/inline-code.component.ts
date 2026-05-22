import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Inline code token. Usage: <app-inline-code>inject()</app-inline-code> */
@Component({
  selector: 'app-inline-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<code class="inline"><ng-content /></code>`,
  styles: `
    :host {
      display: inline;
    }
  `,
})
export class InlineCodeComponent {}
