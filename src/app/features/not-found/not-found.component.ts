import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent],
  template: `
    <section class="container section reveal">
      <app-eyebrow>Erreur 404</app-eyebrow>
      <h1 class="display-l">Page <span class="accent">introuvable</span></h1>
      <p class="lead">Cette page n'existe pas — ou pas encore.</p>
      <a routerLink="/" class="back label-mono">← Retour à l'accueil</a>
    </section>
  `,
  styles: `
    .back {
      display: inline-block;
      margin-top: 16px;
      color: var(--gold);
    }
  `,
})
export class NotFoundComponent {}
