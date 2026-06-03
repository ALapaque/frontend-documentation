import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent],
  template: `
    <section class="container section reveal">
      <div class="panel glass">
        <app-eyebrow>Colophon</app-eyebrow>
        <h1 class="display-l">À <span class="accent">propos</span></h1>
        <p class="lead">
          Practical Docs — documentation pédagogique multi-framework. Angular 21,
          SSR avec hydration, zoneless. Construit en CSS natif, typographie
          Fraunces · Inter Tight · JetBrains Mono.
        </p>
      </div>
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
      padding: clamp(28px, 5vw, 56px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--glass);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      box-shadow: var(--hi-edge), var(--shadow-2);
    }
    .panel h1 {
      margin: 0;
    }
    .panel .lead {
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
