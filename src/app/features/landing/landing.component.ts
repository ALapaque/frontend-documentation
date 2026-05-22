import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { OrnamentComponent } from '../../ui/ornament.component';
import { FrameworkCardComponent } from '../../ui/framework-card.component';
import { ModuleCardComponent } from '../../ui/module-card.component';
import { ContentService } from '../../content/content.service';
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
    <section class="hero container reveal">
      <app-eyebrow>Practical Docs · 2026</app-eyebrow>
      <h1 class="display-xl">
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
      <p class="label-mono meta">{{ total() }} modules · Junior → Senior</p>
    </section>

    <app-ornament />

    <section class="container section">
      <div class="cards">
        @for (fw of frameworks; track fw) {
          <app-framework-card [framework]="fw" [tagline]="tagline[fw]" [count]="count(fw)" />
        }
      </div>
    </section>

    <section class="container section">
      <h2 class="section-h">À la <span class="accent">une</span></h2>
      <div class="featured">
        @for (m of featured(); track m.slug + m.framework; let first = $first) {
          <div [class.lead-cell]="first">
            <app-module-card [meta]="m" />
          </div>
        }
      </div>
    </section>

    <section class="container section philosophy">
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
    </section>
  `,
  styles: `
    .hero {
      padding-top: clamp(64px, 12vw, 140px);
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: flex-start;
    }
    .lead {
      max-width: 620px;
    }
    .cta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .btn {
      padding: 13px 22px;
      border-radius: 999px;
      font-size: 15px;
      transition: transform var(--dur) var(--ease);
    }
    .btn.primary {
      background: linear-gradient(135deg, var(--gold), var(--gold-soft));
      color: #0a0a0c;
      font-weight: 600;
    }
    .btn.ghost {
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .section-h {
      margin-bottom: 24px;
    }
    .featured {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }
    .featured .lead-cell {
      grid-column: span 1;
      grid-row: span 2;
    }
    .featured .lead-cell ::ng-deep .card {
      justify-content: flex-start;
      gap: 16px;
    }
    .philosophy {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
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
    @media (max-width: 860px) {
      .featured,
      .philosophy {
        grid-template-columns: 1fr;
      }
      .featured .lead-cell {
        grid-row: span 1;
      }
    }
  `,
})
export class LandingComponent {
  private readonly content = inject(ContentService);
  protected readonly frameworks = FRAMEWORKS;
  protected readonly tagline = TAGLINE;

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
