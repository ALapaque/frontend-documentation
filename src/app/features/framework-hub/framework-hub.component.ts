import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { LevelChipComponent } from '../../ui/level-chip.component';
import {
  FRAMEWORK_LABEL,
  isFramework,
  LEVELS,
  type Framework,
} from '../../core/levels';

@Component({
  selector: 'app-framework-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent, LevelChipComponent],
  template: `
    @if (valid()) {
      <section class="container section reveal">
        <app-eyebrow>Framework · {{ label()!.toUpperCase() }}</app-eyebrow>
        <h1 class="display-l">{{ label() }}</h1>
        <p class="lead">
          Le hub {{ label() }} — modules par niveau. Catalogue et filtre niveau
          arrivent en Phase 3.
        </p>
        <div class="levels">
          @for (lvl of levels; track lvl) {
            <app-level-chip [level]="lvl" />
          }
        </div>
        <p class="label-mono dim">Grille de modules · à venir</p>
      </section>
    } @else {
      <section class="container section">
        <h1 class="display-l">Framework inconnu</h1>
        <p class="lead">« {{ framework() }} » n'existe pas. Angular, React ou Vue.</p>
      </section>
    }
  `,
  styles: `
    .levels {
      display: flex;
      gap: 10px;
      margin: 8px 0 24px;
    }
    .dim {
      color: var(--text-dim);
    }
  `,
})
export class FrameworkHubComponent {
  readonly framework = input.required<string>();
  protected readonly levels = LEVELS;
  protected readonly valid = computed(() => isFramework(this.framework()));
  protected readonly label = computed(() =>
    isFramework(this.framework()) ? FRAMEWORK_LABEL[this.framework() as Framework] : null,
  );
}
