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
import { FRAMEWORK_LABEL, isFramework, LEVELS, type Framework, type Level } from '../../core/levels';

const FILTER_KEY = 'pd:level-filter';
const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR. La discipline structurée.',
  react: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.',
  vue: 'Reactivity, Vapor, Nuxt. La progressivité élégante.',
  web: 'HTML, fetch, événements, a11y. La plateforme sous les frameworks.',
  css: 'Flexbox, grid, custom properties. La mise en page, en interactif.',
  typescript: 'Types, génériques, inférence, utility types. Le langage qui tient le code à grande échelle.',
  tooling: 'Vite, Rolldown, Vitest, Biome, monorepo. La chaîne qui build, teste et lint.',
};

@Component({
  selector: 'app-framework-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-fw]': 'fw()' },
  imports: [
    RouterLink,
    EyebrowComponent,
    OrnamentComponent,
    ModuleCardComponent,
    LevelFilterComponent,
  ],
  template: `
    @if (fw(); as framework) {
      <section class="container head scroll-reveal" style="view-transition-name: section-hero">
        <app-eyebrow>Framework · {{ label()!.toUpperCase() }}</app-eyebrow>
        <h1 class="display-l headline"><span class="accent">{{ label() }}</span></h1>
        <p class="lead">{{ tagline() }}</p>
        <p class="label-mono dim">
          {{ modules().length }} modules · {{ levels().length }} niveaux · MAJ {{ updated() }}
        </p>
      </section>

      <app-ornament />

      @if (featuredPost(); as post) {
        <section class="container featured-wrap">
          <a class="featured" [routerLink]="['/blog', post.slug]" [attr.data-cover]="post.cover">
            <div class="featured-art" aria-hidden="true"></div>
            <div class="featured-body">
              <span class="label-mono eyebrow">À la une · Blog · {{ postDate(post.date) }}</span>
              <h2 class="featured-title">{{ post.title }}</h2>
              <p class="featured-lead">{{ post.lead }}</p>
              <span class="go label-mono">Lire l'article →</span>
            </div>
          </a>
        </section>
      }

      <section class="container section">
        <div class="bar">
          <app-level-filter [(selected)]="filter" [levels]="levels()" />
          <a routerLink="/compare" class="compare label-mono">
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
    /* Featured blog post block (above the modules grid). */
    .featured-wrap {
      margin-block: clamp(40px, 7vw, 72px);
    }
    .featured {
      position: relative;
      display: block;
      isolation: isolate;
      padding: clamp(28px, 4.2vw, 52px);
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      border: 1px solid var(--border);
      box-shadow: var(--hi-edge), var(--shadow-2);
      overflow: hidden;
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out);
    }
    .featured:hover {
      transform: translateY(-3px);
      box-shadow: var(--hi-edge), var(--shadow-3);
    }
    .featured-art {
      position: absolute;
      inset: 0;
      z-index: -1;
      filter: blur(40px) saturate(1.2);
      opacity: 0.55;
      pointer-events: none;
    }
    .featured[data-cover="angular-v22"] .featured-art {
      background:
        radial-gradient(50vmax 50vmax at 110% -10%,
          color-mix(in oklab, #dd0031 55%, transparent), transparent 60%),
        radial-gradient(34vmax 34vmax at 0% 120%,
          color-mix(in oklab, #ff5a36 45%, transparent), transparent 60%);
    }
    .featured[data-cover="vue-vapor"] .featured-art {
      background:
        radial-gradient(50vmax 50vmax at 110% -10%,
          color-mix(in oklab, #12a474 55%, transparent), transparent 60%),
        radial-gradient(34vmax 34vmax at 0% 120%,
          color-mix(in oklab, #0f7a44 45%, transparent), transparent 60%);
    }
    .featured-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
      max-width: 740px;
    }
    .featured-title {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 800;
      letter-spacing: -0.035em;
      font-size: clamp(26px, 3.6vw, 40px);
      line-height: 1.05;
      color: var(--text);
    }
    .featured-lead {
      color: var(--text-soft);
      font-size: clamp(15px, 1.6vw, 17px);
      line-height: 1.55;
      margin: 0;
    }
    .featured .go {
      color: var(--accent);
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
    if (!fw) return [];
    return [...this.content.forFramework(fw)].sort(
      (a, b) =>
        LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order,
    );
  });

  protected readonly levels = computed<readonly Level[]>(() => {
    const present = new Set(this.modules().map((m) => m.level));
    return LEVELS.filter((l) => present.has(l));
  });

  protected readonly filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.modules() : this.modules().filter((m) => m.level === f);
  });

  protected readonly updated = computed(() => {
    const dates = this.modules().map((m) => m.updated).filter(Boolean).sort();
    return dates.at(-1) ?? '—';
  });

  /** Latest blog post tagged with this framework (powers the featured slot). */
  protected readonly featuredPost = computed(() => {
    const fw = this.fw();
    if (!fw) return null;
    return this.content.blogPostsForFramework(fw)[0] ?? null;
  });

  private readonly postDateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  protected readonly postDate = (iso: string) => this.postDateFmt.format(new Date(iso));

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
