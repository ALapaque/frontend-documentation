import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent],
  template: `
    <section class="container section reveal">
      <div class="about-tile tile">
        <app-eyebrow>Colophon</app-eyebrow>
        <h1 class="display-l">À <span class="accent">propos</span></h1>
        <p class="lead">
          Practical Docs — documentation pédagogique multi-framework. Angular 21,
          SSR avec hydration, zoneless. Construit en CSS natif, typographie
          Space Grotesk · Inter · JetBrains Mono.
        </p>
      </div>
    </section>
  `,
  styles: `
    .about-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 18px;
      padding: clamp(28px, 4vw, 52px);
      max-width: 760px;
    }
    .about-tile .lead {
      max-width: 60ch;
    }
  `,
})
export class AboutComponent {
  constructor() {
    inject(SeoService).set({
      title: 'À propos',
      description:
        'Practical Docs — documentation pédagogique multi-framework. Angular 21, SSR avec hydration, zoneless.',
      path: '/about',
    });
  }
}
