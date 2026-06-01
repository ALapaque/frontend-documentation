import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent],
  template: `
    <section class="container section reveal">
      <div class="panel glass">
        <app-eyebrow>Erreur 404</app-eyebrow>
        <span class="code" aria-hidden="true">404</span>
        <h1 class="display-l">Page <span class="accent">introuvable</span></h1>
        <p class="lead">Cette page n'existe pas — ou pas encore.</p>
        <a routerLink="/" class="back">← Retour à l'accueil</a>
      </div>
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
      padding: clamp(32px, 6vw, 64px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--glass);
      backdrop-filter: blur(22px) saturate(1.4);
      -webkit-backdrop-filter: blur(22px) saturate(1.4);
    }
    .panel h1 {
      margin: 0;
    }
    .code {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(72px, 16vw, 160px);
      line-height: 0.9;
      letter-spacing: -0.04em;
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 8px 40px color-mix(in oklab, var(--accent) 45%, transparent));
    }
    .accent {
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .back {
      display: inline-block;
      margin-top: 8px;
      padding: 13px 24px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      color: var(--bg);
      background: var(--grad);
      box-shadow: var(--glow);
      transition: transform var(--dur) var(--ease-spring), box-shadow var(--dur) var(--ease-out);
    }
    .back:hover {
      transform: translateY(-4px);
      box-shadow: var(--glow), 0 10px 40px -8px color-mix(in oklab, var(--accent) 60%, transparent);
    }
  `,
})
export class NotFoundComponent {}
