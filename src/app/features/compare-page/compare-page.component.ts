import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-compare-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent],
  template: `
    <section class="container section reveal">
      <app-eyebrow>Cross-framework</app-eyebrow>
      <h1 class="display-l">{{ topic() }}</h1>
      <p class="lead">
        Comparatif Angular · React · Vue. Table comparative et code parallèle
        livrés en Phase 3.
      </p>
    </section>
  `,
})
export class ComparePageComponent {
  readonly topic = input.required<string>();
}
