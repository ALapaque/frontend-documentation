import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="foot">
      <hr class="ornament-line" aria-hidden="true" />
      <div class="container grid">
        <div class="col">
          <span class="label-mono">Practical Docs · 2026</span>
          <p class="small dim">
            Trois frameworks. Une discipline. Documentation pédagogique
            Angular, React et Vue.
          </p>
        </div>
        <nav class="col" aria-label="Frameworks">
          <span class="label-mono">Frameworks</span>
          <a routerLink="/angular">Angular</a>
          <a routerLink="/react">React</a>
          <a routerLink="/vue">Vue</a>
        </nav>
        <nav class="col" aria-label="Ressources">
          <span class="label-mono">Ressources</span>
          <a routerLink="/compare/state-management">Comparatifs</a>
          <a routerLink="/search">Recherche</a>
          <a routerLink="/about">À propos</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    .foot {
      margin-top: var(--section-gap);
      padding-bottom: 48px;
    }
    .ornament-line {
      height: 2px;
      border: 0;
      margin: 0;
      background: var(--grad);
      opacity: 0.85;
      box-shadow: 0 0 24px -2px color-mix(in oklab, var(--accent) 60%, transparent);
    }
    .grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 40px;
      padding-top: 48px;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .col .label-mono {
      color: var(--text);
    }
    .col a {
      color: var(--text-soft);
      font-size: 14px;
      width: fit-content;
      transition: color var(--dur) var(--ease);
    }
    .col a:hover {
      color: var(--accent);
    }
    .dim {
      color: var(--text-dim);
      max-width: 42ch;
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 28px;
      }
    }
  `,
})
export class FooterComponent {}
