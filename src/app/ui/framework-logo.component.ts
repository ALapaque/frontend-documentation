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
      @case ('tooling') {
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.2-.4-.4-2.2z" stroke="#7C6CFF" />
          <circle cx="18" cy="6" r="2.2" stroke="#00E5C0" />
        </svg>
      }
      @case ('architecture') {
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="#8b7dff" />
          <path d="M3 12l9 4 9-4" stroke="#6ad9ff" />
          <path d="M3 17l9 4 9-4" stroke="#00e5c0" />
        </svg>
      }
      @case ('ia') {
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" stroke="#c9a0ff" />
          <path d="M18.5 14l.9 2.3 2.1.7-2.1.7-.9 2.3-.9-2.3-2.1-.7 2.1-.7.9-2.3z" stroke="#8de2a1" />
          <path d="M5.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" stroke="#ffb088" />
        </svg>
      }
      @case ('typescript') {
        <svg viewBox="0 0 256 256" role="img" aria-hidden="true">
          <rect width="256" height="256" rx="28" fill="#3178C6" />
          <path
            fill="#fff"
            d="M146.7 130.7v-21h-87v21h31.3v89h24.4v-89zM156 217.6c4 2 8.7 3.6 14.1 4.6 5.4 1 11.1 1.6 17.1 1.6 5.8 0 11.4-.6 16.7-1.7 5.3-1.1 9.9-3 13.9-5.6 4-2.6 7.1-6 9.5-10.3 2.3-4.3 3.5-9.6 3.5-16 0-4.6-.7-8.7-2.1-12.2-1.4-3.5-3.4-6.6-6-9.4-2.6-2.7-5.8-5.2-9.4-7.4-3.7-2.2-7.8-4.2-12.4-6.2-3.4-1.4-6.4-2.7-9.1-4.1-2.7-1.3-5-2.7-6.8-4.1-1.9-1.4-3.3-2.9-4.3-4.5-1-1.6-1.5-3.4-1.5-5.4 0-1.9.5-3.5 1.4-5 .9-1.5 2.2-2.7 3.8-3.8 1.7-1 3.7-1.8 6.1-2.4 2.4-.6 5.1-.8 8-.8 2.1 0 4.4.2 6.7.5 2.4.3 4.8.8 7.2 1.5 2.4.7 4.8 1.5 7 2.6 2.3 1 4.4 2.2 6.3 3.6v-22.8c-3.8-1.5-7.9-2.5-12.4-3.2-4.5-.7-9.6-1.1-15.4-1.1-5.7 0-11.2.6-16.4 1.9-5.2 1.2-9.8 3.2-13.8 5.9-4 2.7-7.1 6.1-9.4 10.4-2.3 4.2-3.5 9.3-3.5 15.2 0 7.5 2.2 13.9 6.5 19.2 4.3 5.3 10.9 9.7 19.7 13.4 3.5 1.5 6.8 2.9 9.9 4.3 3 1.4 5.7 2.9 7.9 4.4 2.2 1.5 4 3.2 5.3 5 1.3 1.8 1.9 3.9 1.9 6.2 0 1.8-.4 3.4-1.3 4.9-.9 1.5-2.1 2.7-3.8 3.8-1.7 1-3.8 1.9-6.3 2.4-2.5.6-5.4.9-8.7.9-5.6 0-11.2-1-16.7-2.9-5.5-2-10.6-4.9-15.3-8.8z"
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
