import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { LevelChipComponent } from '../../ui/level-chip.component';
import { CalloutComponent } from '../../ui/callout.component';
import {
  FRAMEWORK_LABEL,
  isFramework,
  isLevel,
  type Framework,
  type Level,
} from '../../core/levels';

@Component({
  selector: 'app-module-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EyebrowComponent, LevelChipComponent, CalloutComponent],
  template: `
    <section class="container section reveal">
      <p class="label-mono crumb">
        {{ frameworkLabel() }} · {{ level() }} · {{ slug() }}
      </p>
      <app-eyebrow>Module</app-eyebrow>
      <h1 class="display-l">{{ slug() }}</h1>
      @if (levelTyped(); as lvl) {
        <div class="meta">
          <app-level-chip [level]="lvl" />
        </div>
      }
      <app-callout type="info">
        Le rendu du contenu markdown (Shiki, blocs custom, TOC sticky) est livré
        en Phase 2 et Phase 3. Cette page valide le routing
        <code class="inline">/{{ framework() }}/{{ level() }}/{{ slug() }}</code>.
      </app-callout>
    </section>
  `,
  styles: `
    .crumb {
      color: var(--text-dim);
      margin-bottom: 16px;
    }
    .meta {
      margin: 8px 0 28px;
    }
  `,
})
export class ModulePageComponent {
  readonly framework = input.required<string>();
  readonly level = input.required<string>();
  readonly slug = input.required<string>();

  protected readonly levelTyped = computed<Level | null>(() =>
    isLevel(this.level()) ? (this.level() as Level) : null,
  );
  protected readonly frameworkLabel = computed(() =>
    isFramework(this.framework())
      ? FRAMEWORK_LABEL[this.framework() as Framework]
      : this.framework(),
  );
}
