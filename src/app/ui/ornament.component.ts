import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Thick editorial ink rule. */
@Component({
  selector: 'app-ornament',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<hr class="ornament-line" aria-hidden="true" />`,
  styles: `
    :host {
      display: block;
    }
    .ornament-line {
      width: 100%;
      height: 2px;
      border: none;
      background: var(--border-strong);
    }
  `,
})
export class OrnamentComponent {}
