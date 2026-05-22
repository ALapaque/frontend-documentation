import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent],
  template: `
    <section class="container section reveal">
      <app-eyebrow>Colophon</app-eyebrow>
      <h1 class="display-l">À <span class="accent">propos</span></h1>
      <p class="lead">
        Practical Docs — documentation pédagogique multi-framework. Angular 21,
        SSR avec hydration, zoneless. Construit en CSS natif, typographie
        Fraunces · Inter Tight · JetBrains Mono.
      </p>
    </section>
  `,
})
export class AboutComponent {}
