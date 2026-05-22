import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Framework } from '../core/levels';

/** Official Angular / React / Vue brand logos as inline SVG. */
@Component({
  selector: 'app-framework-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (framework()) {
      @case ('angular') {
        <svg viewBox="0 0 256 272" role="img" aria-hidden="true">
          <path fill="#E23237" d="M128 0L0 45.6l19.5 169.4L128 272l108.5-56.9L256 45.6z" />
          <path fill="#B52E31" d="M128 0v30.2V272l108.5-56.9L256 45.6z" />
          <path
            fill="#fff"
            d="M128 30.2L47.7 210h29.9l16.2-40.4h67.9l16.2 40.4h29.9L128 30.2zm23.4 114.6h-46.8L128 88.6z"
          />
        </svg>
      }
      @case ('react') {
        <svg viewBox="-11.5 -10.232 23 20.463" role="img" aria-hidden="true">
          <circle r="2.05" fill="#61dafb" />
          <g stroke="#61dafb" stroke-width="1" fill="none">
            <ellipse rx="11" ry="4.2" />
            <ellipse rx="11" ry="4.2" transform="rotate(60)" />
            <ellipse rx="11" ry="4.2" transform="rotate(120)" />
          </g>
        </svg>
      }
      @case ('vue') {
        <svg viewBox="0 0 261.76 226.69" role="img" aria-hidden="true">
          <path
            fill="#41b883"
            d="M161.096.001l-30.225 52.351L100.647.001H-.005L130.872 226.69 261.749 0z"
          />
          <path
            fill="#35495e"
            d="M161.096.001l-30.225 52.351L100.647.001H52.346l78.526 136.01L209.398.001z"
          />
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
})
export class FrameworkLogoComponent {
  readonly framework = input.required<Framework>();
}
