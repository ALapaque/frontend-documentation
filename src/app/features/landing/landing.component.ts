import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { OrnamentComponent } from '../../ui/ornament.component';
import { FRAMEWORKS, FRAMEWORK_LABEL, type Framework } from '../../core/levels';

interface FrameworkCard {
  readonly id: Framework;
  readonly tagline: string;
}

const CARDS: readonly FrameworkCard[] = [
  { id: 'angular', tagline: 'Signals, zoneless, SSR. La discipline structurée.' },
  { id: 'react', tagline: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.' },
  { id: 'vue', tagline: 'Reactivity, Vapor, Nuxt. La progressivité élégante.' },
];

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent, OrnamentComponent],
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
      <p class="label-mono meta">3 frameworks · Junior → Senior</p>
    </section>

    <app-ornament />

    <section class="container section">
      <div class="cards">
        @for (card of cards; track card.id) {
          <a [routerLink]="['/', card.id]" class="card">
            <span class="mark" [attr.data-fw]="card.id" aria-hidden="true"></span>
            <h2 class="h3">{{ labels[card.id] }}</h2>
            <p class="small dim">{{ card.tagline }}</p>
            <span class="label-mono go">Ouvrir le hub →</span>
          </a>
        }
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
      transition: transform var(--dur) var(--ease), background var(--dur) var(--ease);
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
    .meta {
      margin-top: 8px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 28px;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      transition: transform var(--dur) var(--ease), border-color var(--dur) var(--ease);
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--gold-soft);
    }
    .mark {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--gold);
    }
    .mark[data-fw='angular'] {
      background: linear-gradient(135deg, #b86f6f, #d49b8a);
    }
    .mark[data-fw='react'] {
      background: linear-gradient(135deg, #7fa3b8, #8fa68e);
    }
    .mark[data-fw='vue'] {
      background: linear-gradient(135deg, #8fa68e, #c9a876);
    }
    .dim {
      color: var(--text-soft);
    }
    .go {
      margin-top: auto;
      color: var(--gold);
    }
  `,
})
export class LandingComponent {
  protected readonly cards = CARDS;
  protected readonly frameworks = FRAMEWORKS;
  protected readonly labels = FRAMEWORK_LABEL;
}
