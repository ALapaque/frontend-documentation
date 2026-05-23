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
      @case ('css') {
        <svg viewBox="0 0 256 361" role="img" aria-hidden="true">
          <path fill="#264de4" d="M127 0l116 26-19 211-97 27-97-27L11 26z" />
          <path fill="#2965f1" d="M128 33v296l78-21 16-180z" />
          <path
            fill="#ebebeb"
            d="M75 152l-3-31h56v-30H38l9 91h81v-30zm6 60l-1 1 12 4 1-1z"
          />
          <path
            fill="#fff"
            d="M127 152v30h27l-3 28-24 7v31l45-13 9-83zm0-61v30h63l1-7 2-23z"
          />
        </svg>
      }
      @case ('web') {
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#00E5C0" stroke-width="1.6" />
          <ellipse cx="12" cy="12" rx="4.2" ry="10" stroke="#7C6CFF" stroke-width="1.6" />
          <path d="M2.4 9h19.2M2.4 15h19.2" stroke="#00E5C0" stroke-width="1.6" />
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
