import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { OrnamentComponent } from '../../ui/ornament.component';
import { ModuleCardComponent } from '../../ui/module-card.component';
import { LevelFilterComponent, type LevelFilter } from '../../ui/level-filter.component';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { FRAMEWORK_LABEL, isFramework, type Framework } from '../../core/levels';

const FILTER_KEY = 'pd:level-filter';
const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR. La discipline structurée.',
  react: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.',
  vue: 'Reactivity, Vapor, Nuxt. La progressivité élégante.',
};

@Component({
  selector: 'app-framework-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    EyebrowComponent,
    OrnamentComponent,
    ModuleCardComponent,
    LevelFilterComponent,
  ],
  template: `
    @if (fw(); as framework) {
      <section class="container head scroll-reveal">
        <app-eyebrow>Framework · {{ label()!.toUpperCase() }}</app-eyebrow>
        <h1 class="display-l headline"><span class="accent">{{ label() }}</span></h1>
        <p class="lead">{{ tagline() }}</p>
        <p class="label-mono dim">
          {{ modules().length }} modules · 4 niveaux · MAJ {{ updated() }}
        </p>
      </section>

      <app-ornament />

      <section class="container section">
        <div class="bar">
          <app-level-filter [(selected)]="filter" />
          <a routerLink="/compare/state-management" class="compare label-mono">
            Comparatifs cross-framework →
          </a>
        </div>

        <div class="grid stagger">
          @for (m of filtered(); track m.slug + m.level; let i = $index) {
            <app-module-card [meta]="m" [style.--i]="i" />
          } @empty {
            <p class="dim">Aucun module pour ce niveau.</p>
          }
        </div>
      </section>
    } @else {
      <section class="container section">
        <h1 class="display-l">Framework inconnu</h1>
        <p class="lead">« {{ framework() }} » n'existe pas. Angular, React ou Vue.</p>
      </section>
    }
  `,
  styles: `
    .head {
      padding-top: clamp(48px, 9vw, 96px);
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: flex-start;
    }
    .headline {
      margin: 0;
    }
    .headline .accent {
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .dim {
      color: var(--text-dim);
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px 24px;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-soft);
    }
    .compare {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--accent);
      transition: color var(--dur) var(--ease-out), gap var(--dur) var(--ease-out);
    }
    .compare:hover {
      color: var(--accent-2);
      gap: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }
  `,
})
export class FrameworkHubComponent {
  private readonly content = inject(ContentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly framework = input.required<string>();
  protected readonly filter = signal<LevelFilter>('all');

  protected readonly fw = computed<Framework | null>(() =>
    isFramework(this.framework()) ? (this.framework() as Framework) : null,
  );
  protected readonly label = computed(() => (this.fw() ? FRAMEWORK_LABEL[this.fw()!] : null));
  protected readonly tagline = computed(() => (this.fw() ? TAGLINE[this.fw()!] : ''));

  protected readonly modules = computed(() => {
    const fw = this.fw();
    return fw ? [...this.content.forFramework(fw)].sort((a, b) => a.order - b.order) : [];
  });

  protected readonly filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.modules() : this.modules().filter((m) => m.level === f);
  });

  protected readonly updated = computed(() => {
    const dates = this.modules().map((m) => m.updated).filter(Boolean).sort();
    return dates.at(-1) ?? '—';
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const fw = this.fw();
      if (!fw) return;
      seo.set({
        title: FRAMEWORK_LABEL[fw],
        description: TAGLINE[fw],
        path: `/${fw}`,
      });
    });

    if (this.isBrowser) {
      const stored = localStorage.getItem(FILTER_KEY) as LevelFilter | null;
      if (stored) this.filter.set(stored);
      effect(() => {
        localStorage.setItem(FILTER_KEY, this.filter());
      });
    }
  }
}
