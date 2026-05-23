import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { MorphService } from '../../core/morph.service';

@Component({
  selector: 'app-compare-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent],
  template: `
    <section class="container head reveal">
      <app-eyebrow>Cross-framework</app-eyebrow>
      <h1 class="display-l">Comparatifs &amp; <span class="accent">pièges</span></h1>
      <p class="lead">
        Angular, React et Vue côte à côte — choix d'architecture, et les pièges à
        éviter, avec le « pourquoi » à chaque fois.
      </p>
    </section>

    <section class="container section">
      <div class="grid stagger">
        @for (c of topics; track c.topic; let i = $index) {
          <a
            class="card"
            [routerLink]="['/compare', c.topic]"
            [style.--i]="i % 9"
            [style.view-transition-name]="morph.activeKey() === 'compare-' + c.topic ? 'compare-hero' : null"
            (click)="morph.activeKey.set('compare-' + c.topic)"
          >
            <h2 class="h3 title">{{ c.title }}</h2>
            <p class="lead-sm">{{ c.lead }}</p>
            <span class="go" aria-hidden="true">Lire le comparatif →</span>
          </a>
        }
      </div>
    </section>
  `,
  styles: `
    .head {
      padding-top: clamp(48px, 9vw, 96px);
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: flex-start;
    }
    .lead {
      max-width: 620px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 18px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 26px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--glass);
      backdrop-filter: blur(20px) saturate(1.3);
      -webkit-backdrop-filter: blur(20px) saturate(1.3);
      transition: transform var(--dur) var(--ease-spring),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .card:hover {
      transform: translateY(-5px);
      border-color: color-mix(in oklab, var(--accent) 45%, transparent);
      box-shadow: var(--glow);
    }
    .title {
      color: var(--text);
    }
    .lead-sm {
      color: var(--text-soft);
      flex: 1;
      line-height: 1.5;
    }
    .go {
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent-2);
      transition: transform var(--dur) var(--ease-out);
    }
    .card:hover .go {
      transform: translateX(4px);
    }
  `,
})
export class CompareIndexComponent {
  protected readonly morph = inject(MorphService);
  protected readonly topics = inject(ContentService).compareTopics;

  constructor() {
    inject(SeoService).set({
      title: 'Comparatifs cross-framework',
      description:
        'Comparatifs Angular vs React vs Vue : state management, réactivité, SSR, formulaires, routing, testing, et les pièges à éviter.',
      path: '/compare',
    });
  }
}
