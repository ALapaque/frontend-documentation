import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { OrnamentComponent } from '../../ui/ornament.component';
import { FrameworkCardComponent } from '../../ui/framework-card.component';
import { ModuleCardComponent } from '../../ui/module-card.component';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_TAGLINE } from '../../core/site';
import { FRAMEWORKS, type Framework } from '../../core/levels';
import type { ModuleMeta } from '../../content/content.types';

const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR. La discipline structurée.',
  react: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.',
  vue: 'Reactivity, Vapor, Nuxt. La progressivité élégante.',
};

const FEATURED: ReadonlyArray<[Framework, 'junior' | 'medior' | 'senior', string]> = [
  ['angular', 'medior', 'signals'],
  ['angular', 'junior', 'lifecycle'],
  ['react', 'senior', 'rsc'],
  ['vue', 'senior', 'vapor-mode'],
  ['angular', 'senior', 'ssr-hydration'],
  ['react', 'medior', 'server-state'],
];

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    EyebrowComponent,
    OrnamentComponent,
    FrameworkCardComponent,
    ModuleCardComponent,
  ],
  template: `
    <section class="container bento reveal stagger">
      <div class="cell hero tile tile-ink" style="--i: 0">
        <app-eyebrow>Practical Docs · 2026</app-eyebrow>
        <h1 class="display-2xl headline">
          Three frameworks.<br />
          One <span class="accent">discipline</span>.
        </h1>
        <p class="lead">
          Angular, React et Vue — expliqués du Junior au Senior. Pas de bullshit,
          des exemples minimaux, des diagrammes là où le texte échoue.
        </p>
        <div class="cta">
          <a routerLink="/angular" class="btn primary">Explorer Angular</a>
          <a routerLink="/compare/state-management" class="btn ghost">Voir les comparatifs</a>
        </div>
      </div>

      <div class="cell stat tile tile-accent" style="--i: 1">
        <span class="label-mono">Catalogue</span>
        <span class="display-xl tnum num">{{ total() }}</span>
        <span class="stat-label">modules · Junior → Senior</span>
      </div>

      @for (fw of frameworks; track fw; let idx = $index) {
        <div class="cell fw" [style.--i]="idx + 2">
          <app-framework-card [framework]="fw" [tagline]="tagline[fw]" [count]="count(fw)" />
        </div>
      }

      <div class="cell feat-head" style="--i: 5">
        <h2 class="section-h">À la <span class="accent">une</span></h2>
      </div>

      @for (m of featured(); track m.slug + m.framework; let i = $index; let first = $first) {
        <div class="cell mod" [class.mod-lead]="first" [style.--i]="i + 6">
          <app-module-card [meta]="m" />
        </div>
      }

      <div class="cell philosophy tile tile-press" style="--i: 12">
        <div class="col">
          <span class="label-mono">Clarté</span>
          <p>
            Un concept à la fois, nommé pour ce qu'il est. Pas de jargon gratuit,
            pas de détour.
          </p>
        </div>
        <div class="col">
          <span class="label-mono">Profondeur</span>
          <p>
            Trois niveaux assumés. Le Senior creuse l'implémentation là où le
            Junior pose les fondations.
          </p>
        </div>
        <div class="col">
          <span class="label-mono">Honnêteté</span>
          <p>
            Les pièges, les trade-offs, les idées reçues. On dit quand un outil ne
            vaut pas son coût.
          </p>
        </div>
      </div>
    </section>

    <app-ornament />
  `,
  styles: `
    .bento {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-flow: dense;
      gap: 18px;
      padding-top: clamp(40px, 7vw, 80px);
      padding-bottom: clamp(40px, 7vw, 72px);
      align-items: stretch;
    }
    .cell {
      min-width: 0;
    }

    /* Hero — large dark tile */
    .hero {
      grid-column: span 8;
      grid-row: span 2;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 22px;
      padding: clamp(28px, 4vw, 48px);
    }
    .hero .headline {
      color: var(--on-ink);
    }
    .hero .lead {
      color: var(--on-ink-soft);
      max-width: 560px;
    }
    .cta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .btn {
      padding: 13px 22px;
      border-radius: var(--radius-pill);
      font-size: 15px;
      font-weight: 600;
      border: 1.5px solid var(--border-strong);
      box-shadow: var(--shadow-1);
      transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .btn.primary {
      background: var(--accent);
      color: #fff;
    }
    .btn.ghost {
      background: var(--bg-card);
      color: var(--ink);
    }
    .btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: var(--shadow-2);
    }

    /* Accent stat tile */
    .stat {
      grid-column: span 4;
      grid-row: span 2;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      padding: clamp(24px, 3vw, 36px);
    }
    .stat .label-mono {
      color: rgba(255, 255, 255, 0.85);
    }
    .stat .num {
      color: #fff;
      line-height: 0.9;
    }
    .stat .stat-label {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(18px, 2.2vw, 24px);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    /* Framework cards */
    .fw {
      grid-column: span 4;
    }
    .fw ::ng-deep .card {
      height: 100%;
    }

    .feat-head {
      grid-column: 1 / -1;
      margin-top: 8px;
    }

    /* Featured module tiles */
    .mod {
      grid-column: span 4;
    }
    .mod-lead {
      grid-column: span 4;
      grid-row: span 2;
    }
    .mod-lead ::ng-deep .card {
      justify-content: flex-start;
      gap: 16px;
    }

    /* Philosophy strip — single bordered tile, 3 columns */
    .philosophy {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(24px, 4vw, 48px);
      padding: clamp(28px, 4vw, 44px);
      margin-top: 8px;
    }
    .philosophy .col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .philosophy p {
      color: var(--text-soft);
      max-width: 36ch;
    }

    @media (max-width: 1040px) {
      .hero {
        grid-column: span 12;
        grid-row: auto;
      }
      .stat {
        grid-column: span 12;
        grid-row: auto;
      }
      .fw {
        grid-column: span 6;
      }
      .mod,
      .mod-lead {
        grid-column: span 6;
        grid-row: auto;
      }
    }
    @media (max-width: 860px) {
      .bento {
        grid-template-columns: 1fr;
      }
      .cell,
      .hero,
      .stat,
      .fw,
      .mod,
      .mod-lead,
      .feat-head,
      .philosophy {
        grid-column: 1 / -1;
        grid-row: auto;
      }
      .philosophy {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LandingComponent {
  private readonly content = inject(ContentService);
  protected readonly frameworks = FRAMEWORKS;
  protected readonly tagline = TAGLINE;

  constructor() {
    inject(SeoService).set({
      title: SITE_TAGLINE,
      description:
        'Documentation pédagogique Angular, React et Vue — du Junior au Senior. Exemples minimaux, pièges et trade-offs.',
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Practical Docs',
        description: 'Documentation pédagogique multi-framework.',
      },
    });
  }

  protected readonly total = computed(() => this.content.catalogue.length);

  protected count(fw: Framework): number {
    return this.content.forFramework(fw).length;
  }

  protected readonly featured = computed<ModuleMeta[]>(() =>
    FEATURED.map(([fw, lvl, slug]) => this.content.meta(fw, lvl, slug)).filter(
      (m): m is ModuleMeta => m !== undefined,
    ),
  );
}
