import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent],
  template: `
    <section class="container section reveal">
      <div class="nf-tile tile tile-ink">
        <app-eyebrow>Erreur 404</app-eyebrow>
        <h1 class="display-2xl code">404</h1>
        <h2 class="display-l hl">Page <span class="accent">introuvable</span></h2>
        <p class="lead">Cette page n'existe pas — ou pas encore.</p>
        <a routerLink="/" class="back">← Retour à l'accueil</a>
      </div>
    </section>
  `,
  styles: `
    .nf-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      padding: clamp(32px, 5vw, 64px);
      max-width: 760px;
    }
    .nf-tile .code {
      color: var(--on-ink);
      line-height: 0.9;
    }
    .nf-tile .hl {
      color: var(--on-ink);
    }
    .nf-tile .lead {
      color: var(--on-ink-soft);
    }
    .back {
      display: inline-flex;
      align-items: center;
      margin-top: 12px;
      padding: 12px 20px;
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      box-shadow: var(--shadow-1);
      transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .back:hover {
      transform: translate(-2px, -2px);
      box-shadow: var(--shadow-2);
    }
  `,
})
export class NotFoundComponent {}
