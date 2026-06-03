import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';

/** Blog landing: a featured hero (latest post) + a grid of older posts. */
@Component({
  selector: 'app-blog-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent],
  template: `
    <section class="container head reveal">
      <app-eyebrow>Blog</app-eyebrow>
      <h1 class="display-l">Notes <span class="accent">d'atelier</span></h1>
      <p class="lead">
        Ce qui change cette semaine, comment migrer, et les décisions à prendre.
        Pas un journal de releases — un guide à chaud pour les équipes en prod.
      </p>
    </section>

    @if (featured(); as f) {
      <section class="container section">
        <a [routerLink]="['/blog', f.slug]" class="featured" [attr.data-cover]="f.cover">
          <div class="featured-art" aria-hidden="true"></div>
          <div class="featured-body">
            <span class="label-mono eyebrow">À la une · {{ formattedDate(f.date) }}</span>
            <h2 class="display-l title shimmer-text">{{ f.title }}</h2>
            <p class="lead">{{ f.lead }}</p>
            <span class="go label-mono">Lire l'article →</span>
          </div>
        </a>
      </section>
    }

    @if (rest().length) {
      <section class="container section">
        <h2 class="section-h">Archives</h2>
        <div class="grid stagger">
          @for (p of rest(); track p.slug; let i = $index) {
            <a [routerLink]="['/blog', p.slug]" class="card" [style.--i]="i % 9">
              <span class="label-mono date">{{ formattedDate(p.date) }}</span>
              <h3 class="h3 title">{{ p.title }}</h3>
              <p class="excerpt">{{ p.lead }}</p>
              <span class="go label-mono">Lire →</span>
            </a>
          }
        </div>
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
    .lead {
      max-width: 640px;
    }

    /* Featured post: oversized card with a coloured wash matching its cover. */
    .featured {
      position: relative;
      display: grid;
      grid-template-columns: 1fr;
      isolation: isolate;
      padding: clamp(28px, 4vw, 56px);
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
      opacity: 0.55;
      filter: blur(40px) saturate(1.2);
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
      gap: 14px;
      align-items: flex-start;
      max-width: 720px;
    }
    .featured .title {
      margin: 0;
      letter-spacing: -0.04em;
    }
    .featured .go {
      color: var(--accent);
    }

    /* Archive grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
      margin-top: 22px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      padding: 22px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      box-shadow: var(--hi-edge), var(--shadow-1);
      transition: transform var(--dur) var(--ease-spring),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
      box-shadow: var(--shadow-2);
    }
    .date {
      color: var(--text-dim);
    }
    .card .title {
      color: var(--text);
    }
    .excerpt {
      color: var(--text-soft);
      flex: 1;
      font-size: 14px;
      line-height: 1.55;
    }
    .card .go {
      color: var(--accent);
    }
  `,
})
export class BlogIndexComponent {
  private readonly content = inject(ContentService);

  protected readonly posts = computed(() => this.content.blogPosts);
  protected readonly featured = computed(() => this.posts()[0]);
  protected readonly rest = computed(() => this.posts().slice(1));

  protected readonly formattedDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(iso));

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      seo.set({
        title: 'Blog',
        description: "Notes d'atelier — ce qui change, comment migrer, les décisions à prendre.",
        path: '/blog',
      });
    });
  }
}
