import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent],
  template: `
    <section class="container section reveal">
      <app-eyebrow>Recherche</app-eyebrow>
      <h1 class="display-l">Chercher dans la doc</h1>
      <p class="lead">
        Recherche full-text et palette <kbd>⌘K</kbd> livrées en Phase 3
        (index pré-généré au build).
      </p>
    </section>
  `,
  styles: `
    kbd {
      font-family: var(--font-mono);
      font-size: 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      color: var(--text-soft);
    }
  `,
})
export class SearchComponent {}
