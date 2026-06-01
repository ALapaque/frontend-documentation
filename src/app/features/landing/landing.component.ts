import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_TAGLINE } from '../../core/site';
import { FRAMEWORKS, FUNDAMENTALS, FRAMEWORK_LABEL, type Framework } from '../../core/levels';

const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR. La discipline structurée.',
  react: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.',
  vue: 'Reactivity, Vapor, Nuxt. La progressivité élégante.',
  web: 'HTML, fetch, événements, a11y. La plateforme sous les frameworks.',
  css: 'Flexbox, grid, custom properties — en interactif.',
  typescript: 'Types, génériques, inférence. Le langage qui tient le code.',
  tooling: 'Vite, Vitest, Biome, monorepo. La chaîne qui build et teste.',
};

/** Editorial home — newspaper masthead, featured story up top, then framework
 *  and fundamentals sections as plain typographic rows separated by hairlines.
 *  No card grids, no big buttons; reading rhythm + ornament lines do the work. */
@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="editorial">
      <!-- Masthead — newspaper banner with issue label and date -->
      <header class="masthead container">
        <div class="masthead-row">
          <span class="label-mono issue">Practical Docs · N° {{ issueNumber() }}</span>
          <span class="label-mono date">{{ today() }}</span>
        </div>
        <hr class="rule" />
      </header>

      <!-- Featured story: Angular v22 blog post, typographic full-width hero -->
      @if (featuredPost(); as fp) {
        <section class="container featured">
          <a class="featured-link" [routerLink]="['/blog', fp.slug]">
            <span class="label-mono eyebrow accent-text">À la une · {{ formatDate(fp.date) }}</span>
            <h1 class="display-2xl story-title">{{ fp.title }}</h1>
            <p class="lead story-lead">{{ fp.lead }}</p>
            <span class="read-cta">Lire l'article<span class="arrow">→</span></span>
          </a>
        </section>
        <hr class="rule container" />
      }

      <!-- Manifesto: who this site is for, single column, italic -->
      <section class="container manifesto">
        <p class="lead manifest">
          Angular, React et Vue — expliqués du Junior au Senior. Pas de bullshit,
          des exemples minimaux, des diagrammes là où le texte échoue.
        </p>
        <div class="stats">
          <span><strong class="num">{{ total() }}</strong> articles</span>
          <span class="sep">·</span>
          <span><strong class="num">{{ frameworks.length }}</strong> frameworks</span>
          <span class="sep">·</span>
          <span><strong class="num">{{ fundamentals.length }}</strong> fondamentaux</span>
          <span class="sep">·</span>
          <span><strong class="num">4</strong> niveaux</span>
        </div>
      </section>

      <hr class="rule container" />

      <!-- Frameworks as typographic rows, not cards -->
      <section class="container index-section">
        <header class="index-head">
          <span class="label-mono kicker">Les frameworks</span>
          <h2 class="section-h">Trois grammaires.</h2>
        </header>
        <ol class="rows">
          @for (fw of frameworks; track fw; let i = $index) {
            <li class="row" [attr.data-fw]="fw">
              <a [routerLink]="['/', fw]" class="row-link">
                <span class="num-chapter label-mono">{{ chapterNum(i + 1) }}</span>
                <span class="row-title">{{ label(fw) }}</span>
                <span class="row-tagline">{{ tagline[fw] }}</span>
                <span class="row-meta label-mono">{{ count(fw) }} articles</span>
                <span class="row-arrow" aria-hidden="true">→</span>
              </a>
            </li>
          }
        </ol>
      </section>

      <hr class="rule container" />

      <!-- Fundamentals — same row pattern -->
      <section class="container index-section">
        <header class="index-head">
          <span class="label-mono kicker">Fondamentaux</span>
          <h2 class="section-h">La plateforme sous les frameworks.</h2>
        </header>
        <ol class="rows">
          @for (fn of fundamentals; track fn; let i = $index) {
            <li class="row">
              <a [routerLink]="['/', fn]" class="row-link">
                <span class="num-chapter label-mono">{{ chapterNum(i + 1) }}</span>
                <span class="row-title">{{ label(fn) }}</span>
                <span class="row-tagline">{{ tagline[fn] }}</span>
                <span class="row-meta label-mono">{{ count(fn) }} articles</span>
                <span class="row-arrow" aria-hidden="true">→</span>
              </a>
            </li>
          }
        </ol>
      </section>

      <hr class="rule container" />

      <!-- Recent blog posts as a press list -->
      @if (recentPosts().length) {
        <section class="container index-section">
          <header class="index-head">
            <span class="label-mono kicker">Du blog</span>
            <h2 class="section-h">Notes d'atelier récentes.</h2>
          </header>
          <ol class="posts">
            @for (p of recentPosts(); track p.slug) {
              <li class="post">
                <a [routerLink]="['/blog', p.slug]" class="post-link">
                  <span class="post-date label-mono">{{ formatDate(p.date) }}</span>
                  <span class="post-title">{{ p.title }}</span>
                  <span class="post-lead">{{ p.lead }}</span>
                </a>
              </li>
            }
          </ol>
        </section>
        <hr class="rule container" />
      }

      <!-- Colophon — three values in a pull-quote -->
      <section class="container colophon">
        <span class="label-mono kicker">Trois principes.</span>
        <p class="quote">
          <span class="dropcap">C</span>larté — un concept à la fois, nommé pour ce qu'il est.
          <strong>Profondeur</strong> — trois niveaux assumés, le senior creuse là où le junior pose
          les fondations. <strong>Honnêteté</strong> — les pièges, les trade-offs et les idées reçues
          dits sans détour.
        </p>
      </section>
    </div>
  `,
  styles: `
    /* Editorial home — long, narrow, vertical rhythm carried by hairlines. */
    .editorial {
      padding-block: clamp(28px, 6vw, 56px) clamp(80px, 12vw, 160px);
    }

    .container {
      max-width: 980px;
    }

    /* ---- Masthead ---- */
    .masthead {
      margin-bottom: clamp(40px, 7vw, 72px);
    }
    .masthead-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      padding-bottom: 14px;
    }
    .issue,
    .date {
      color: var(--text-soft);
    }

    /* Hairline rule, double-line newspaper style on top, single below. */
    .rule {
      border: 0;
      height: 1px;
      background: var(--border);
      margin: clamp(40px, 6vw, 64px) auto;
      max-width: 980px;
      padding-inline: var(--gutter);
      box-sizing: content-box;
    }
    .masthead .rule {
      margin: 0;
      max-width: none;
      padding: 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      height: 4px;
    }

    /* ---- Featured story (Angular v22 blog post, full bleed typo) ---- */
    .featured {
      max-width: 760px;
    }
    .featured-link {
      display: block;
      text-decoration: none;
      color: inherit;
    }
    .featured-link:hover .read-cta {
      color: var(--accent);
    }
    .featured-link:hover .arrow {
      transform: translateX(6px);
    }
    .accent-text {
      color: var(--accent);
    }
    .story-title {
      margin: 12px 0 18px;
      color: var(--text);
    }
    .story-lead {
      max-width: 640px;
    }
    .read-cta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-top: 22px;
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 500;
      color: var(--text-soft);
      transition: color var(--dur) var(--ease-out);
    }
    .arrow {
      transition: transform var(--dur) var(--ease-out);
    }

    /* ---- Manifesto ---- */
    .manifesto {
      max-width: 760px;
    }
    .manifest {
      margin-bottom: 18px;
    }
    .stats {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px 10px;
      font-family: var(--font-display);
      font-size: 14px;
      color: var(--text-dim);
    }
    .stats .num {
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--text);
      font-size: 15px;
      margin-right: 2px;
    }
    .stats .sep {
      opacity: 0.5;
    }

    /* ---- Index sections (frameworks / fundamentals) ---- */
    .index-section {
      max-width: 980px;
    }
    .index-head {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: clamp(20px, 3vw, 32px);
    }
    .kicker {
      color: var(--text-soft);
    }
    .index-head .section-h {
      margin: 0;
      color: var(--text);
    }

    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .row {
      border-top: 1px solid var(--border);
    }
    .row:last-child {
      border-bottom: 1px solid var(--border);
    }
    .row-link {
      display: grid;
      grid-template-columns: 56px minmax(140px, 1fr) 2.4fr auto auto;
      align-items: baseline;
      gap: 24px;
      padding: 22px 4px;
      text-decoration: none;
      color: inherit;
      transition: background var(--dur) var(--ease-out);
    }
    .row-link:hover {
      background: color-mix(in oklab, var(--accent) 5%, transparent);
    }
    .row-link:hover .row-arrow {
      color: var(--accent);
      transform: translateX(6px);
    }
    .row-link:hover .row-title {
      color: var(--accent);
    }
    /* per-fw accent on hover when [data-fw] is set */
    .row[data-fw="angular"] .row-link:hover {
      background: color-mix(in oklab, #ff7177 6%, transparent);
    }
    .row[data-fw="angular"] .row-link:hover .row-title,
    .row[data-fw="angular"] .row-link:hover .row-arrow {
      color: #ff7177;
    }
    .row[data-fw="react"] .row-link:hover {
      background: color-mix(in oklab, #7ad8ef 6%, transparent);
    }
    .row[data-fw="react"] .row-link:hover .row-title,
    .row[data-fw="react"] .row-link:hover .row-arrow {
      color: #7ad8ef;
    }
    .row[data-fw="vue"] .row-link:hover {
      background: color-mix(in oklab, #8de2a1 6%, transparent);
    }
    .row[data-fw="vue"] .row-link:hover .row-title,
    .row[data-fw="vue"] .row-link:hover .row-arrow {
      color: #8de2a1;
    }
    .num-chapter {
      color: var(--text-dim);
    }
    .row-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(22px, 2.4vw, 28px);
      color: var(--text);
      letter-spacing: -0.012em;
      transition: color var(--dur) var(--ease-out);
    }
    .row-tagline {
      font-family: var(--font-display);
      font-weight: 400;
      font-style: italic;
      color: var(--text-soft);
      font-size: 16px;
      line-height: 1.4;
    }
    .row-meta {
      color: var(--text-dim);
      white-space: nowrap;
    }
    .row-arrow {
      color: var(--text-dim);
      font-size: 22px;
      transition: color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
    }

    @media (max-width: 720px) {
      .row-link {
        grid-template-columns: 36px 1fr auto;
        grid-template-rows: auto auto;
        gap: 4px 14px;
        padding: 18px 4px;
      }
      .num-chapter {
        grid-row: 1;
      }
      .row-title {
        grid-row: 1;
        font-size: 22px;
      }
      .row-arrow {
        grid-row: 1;
      }
      .row-tagline {
        grid-column: 2 / -1;
        grid-row: 2;
        font-size: 14px;
      }
      .row-meta {
        display: none;
      }
    }

    /* ---- Recent posts as press list ---- */
    .posts {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .post {
      border-top: 1px solid var(--border);
    }
    .post:last-child {
      border-bottom: 1px solid var(--border);
    }
    .post-link {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 24px;
      padding: 22px 4px;
      text-decoration: none;
      color: inherit;
      transition: background var(--dur) var(--ease-out);
    }
    .post-link:hover {
      background: color-mix(in oklab, var(--accent) 5%, transparent);
    }
    .post-link:hover .post-title {
      color: var(--accent);
    }
    .post-date {
      color: var(--text-dim);
      padding-top: 6px;
    }
    .post-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(20px, 2.2vw, 26px);
      color: var(--text);
      grid-column: 2;
      transition: color var(--dur) var(--ease-out);
    }
    .post-lead {
      font-family: var(--font-display);
      font-style: italic;
      color: var(--text-soft);
      font-size: 16px;
      line-height: 1.5;
      grid-column: 2;
      margin-top: 6px;
    }
    @media (max-width: 720px) {
      .post-link {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .post-title,
      .post-lead {
        grid-column: 1;
      }
    }

    /* ---- Colophon — three principles as a pull quote ---- */
    .colophon {
      max-width: 760px;
    }
    .quote {
      font-family: var(--font-display);
      font-weight: 400;
      font-size: clamp(20px, 2.4vw, 26px);
      line-height: 1.5;
      color: var(--text);
      margin-top: 18px;
      font-optical-sizing: auto;
    }
    .quote strong {
      font-weight: 600;
      color: var(--text);
    }
    .dropcap {
      float: left;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(56px, 7vw, 84px);
      line-height: 0.85;
      color: var(--accent);
      padding-right: 10px;
      padding-top: 4px;
    }
  `,
})
export class LandingComponent {
  private readonly content = inject(ContentService);
  protected readonly frameworks = FRAMEWORKS;
  protected readonly fundamentals = FUNDAMENTALS;
  protected readonly tagline = TAGLINE;
  protected readonly label = (fw: Framework) => FRAMEWORK_LABEL[fw];

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

  /** Latest blog post (the lead story for the editorial home). */
  protected readonly featuredPost = computed(() => this.content.blogPosts[0] ?? null);
  /** Following posts for the "Du blog" list (excludes the featured one). */
  protected readonly recentPosts = computed(() => this.content.blogPosts.slice(1, 5));

  private readonly dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  protected formatDate(iso: string): string {
    return this.dateFmt.format(new Date(iso));
  }
  protected today(): string {
    return this.dateFmt.format(new Date());
  }
  protected chapterNum(n: number): string {
    return String(n).padStart(2, '0');
  }
  /** A small monotonic-ish issue number — first day of this month, in this year. */
  protected issueNumber(): number {
    const start = new Date(2026, 0, 1).getTime();
    const months = Math.floor((Date.now() - start) / (30 * 24 * 3600 * 1000));
    return months + 1;
  }
}
