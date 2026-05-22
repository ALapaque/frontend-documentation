import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Decorative animated gold gradient line. */
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
      background-size: 200% 100%;
    }
    @media (prefers-reduced-motion: no-preference) {
      .ornament-line {
        animation: shimmer 6s linear infinite;
      }
      @keyframes shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
    }
  `,
})
export class OrnamentComponent {}
