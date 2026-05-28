import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';
import { SearchPaletteComponent } from './ui/search-palette.component';
import { ChangelogModalComponent } from './ui/changelog-modal.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SearchPaletteComponent,
    ChangelogModalComponent,
  ],
  template: `
    <a class="skip-link" href="#main">Aller au contenu</a>
    <app-header />
    <main id="main">
      <router-outlet />
    </main>
    <app-footer />
    <app-search-palette />
    <app-changelog-modal />

    <!-- Liquid Glass refraction filter — referenced by .lg-refract backdrops.
         Subtle fractal displacement that bends the blurred backdrop like a lens. -->
    <svg class="lg-defs" aria-hidden="true" focusable="false">
      <filter id="lg-refract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.013" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="1.6" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="20" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  `,
})
export class App {
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
      let frame = 0;
      // Lazy-load Lenis so it never touches the SSR/initial path.
      void import('lenis').then(({ default: Lenis }) => {
        lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
        const loop = (time: number) => {
          lenis?.raf(time);
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      });
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        lenis?.destroy();
      });
    });
  }
}
