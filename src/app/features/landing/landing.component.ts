import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_TAGLINE } from '../../core/site';
import { FRAMEWORKS, FUNDAMENTALS, FRAMEWORK_LABEL, type Framework } from '../../core/levels';
import { FrameworkLogoComponent } from '../../ui/framework-logo.component';

const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR.',
  react: 'RSC, compiler, concurrent.',
  vue: 'Reactivity, Vapor, Nuxt.',
  web: 'HTML, fetch, events, a11y.',
  css: 'Layout, motion, theming.',
  typescript: 'Types, generics, inference.',
  tooling: 'Vite, Vitest, Biome.',
  architecture: 'Monorepo, DDD, TDD, slices.',
};

/** Glass Reverie landing — pastel mesh + glass cards + iridescent chrome word.
 *  Bento: featured (mouse-tilt), stats, 3 framework tiles aligned, fundamentals strip.
 *  Real brand logos in their own dark plinths. */
@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrameworkLogoComponent],
  template: `
    <main class="page">
      <section class="hero container">
        <a class="badge" routerLink="/blog/angular-22-ce-que-ca-change">
          <span class="badge-dot" aria-hidden="true"></span>
          <span class="badge-eyebrow label-mono">Nouveau</span>
          <span class="badge-text">Angular 22 est là — Signal Forms stables, zoneless par défaut</span>
        </a>

        <h1 class="display-2xl headline">
          Trois frameworks.<br />
          Une <span class="shimmer-text">discipline</span>.
        </h1>
        <p class="lead">
          Angular, React et Vue — du Junior au Senior. Exemples minimaux, pièges
          assumés, comparaisons côte à côte.
        </p>

        <div class="cta">
          <a routerLink="/angular" class="btn primary">Explorer Angular →</a>
          <a routerLink="/compare" class="btn ghost">Voir les comparatifs</a>
        </div>
      </section>

      <section class="bento container">
        @if (featuredPost(); as fp) {
          <a class="tile tile-featured tilt" [routerLink]="['/blog', fp.slug]">
            <span class="tile-ey label-mono">À la une · Blog</span>
            <h2 class="tile-title">{{ fp.title }}</h2>
            <p class="tile-lead">{{ fp.lead }}</p>
            <span class="tile-cta">Lire l'article →</span>
          </a>
        }

        <div class="tile tile-stats">
          <div class="stat">
            <span class="stat-num" [attr.data-count]="total()">0</span>
            <span class="stat-lbl label-mono">Articles</span>
          </div>
          <div class="stat">
            <span class="stat-num" data-count="7">0</span>
            <span class="stat-lbl label-mono">Sections</span>
          </div>
          <div class="stat">
            <span class="stat-num" data-count="4">0</span>
            <span class="stat-lbl label-mono">Niveaux</span>
          </div>
        </div>

        @for (fw of frameworks; track fw) {
          <a class="tile tile-fw" [routerLink]="['/', fw]">
            <div class="fw-logo">
              <app-framework-logo [framework]="fw" />
            </div>
            <h3 class="fw-title">{{ label(fw) }}</h3>
            <p class="fw-tagline">{{ tagline[fw] }}</p>
            <span class="fw-meta label-mono">{{ count(fw) }} articles · 4 niveaux</span>
          </a>
        }

        <div class="tile tile-fundamentals">
          <header class="fund-head">
            <span class="tile-ey label-mono">Fondamentaux</span>
            <h3 class="fund-title">La plateforme sous les frameworks</h3>
          </header>
          <ul class="fund-list">
            @for (fn of fundamentals; track fn) {
              <li>
                <a [routerLink]="['/', fn]" class="fund-item">
                  <span class="fund-name">{{ label(fn) }}</span>
                  <span class="fund-count label-mono">{{ count(fn) }}</span>
                </a>
              </li>
            }
          </ul>
        </div>
      </section>
    </main>
  `,
  styles: `
    .page {
      padding-block: clamp(20px, 4vw, 40px) clamp(60px, 10vw, 120px);
    }
    .container { max-width: 1180px; }

    /* ===== HERO ===== */
    .hero {
      padding-block: clamp(56px, 9vw, 110px) clamp(36px, 5vw, 56px);
      text-align: center;
      max-width: 1100px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px 8px 12px;
      margin-bottom: 36px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: var(--bg-card);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      font-size: 13px;
      color: var(--text-soft);
      text-decoration: none;
      box-shadow: var(--hi-edge);
      transition: border-color var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-spring);
    }
    .badge:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }
    .badge-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 14px var(--accent);
    }
    @media (prefers-reduced-motion: no-preference) {
      .badge-dot { animation: pulse-dot 2s var(--ease-out) infinite; }
      @keyframes pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.7; }
      }
    }
    .badge-eyebrow { color: var(--accent); }
    .badge-text { color: var(--text); font-weight: 500; }

    .headline {
      margin: 0 auto 24px;
      max-width: 16ch;
      color: var(--text);
    }
    .lead { max-width: 560px; margin: 0 auto 36px; }
    .cta {
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out);
    }
    .btn.primary {
      color: var(--bg);
      background: var(--text);
      box-shadow: 0 8px 32px -4px color-mix(in oklab, var(--text) 40%, transparent),
        0 0 0 1px color-mix(in oklab, var(--text) 30%, transparent);
    }
    .btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 40px -6px color-mix(in oklab, var(--text) 50%, transparent),
        0 0 0 1px color-mix(in oklab, var(--text) 40%, transparent);
    }
    .btn.ghost {
      color: var(--text);
      border: 1px solid var(--border-strong);
      background: var(--bg-card);
    }
    .btn.ghost:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    /* ===== BENTO ===== */
    .bento {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      grid-auto-rows: minmax(140px, auto);
      gap: 22px;
      margin-top: clamp(40px, 6vw, 80px);
    }
    .tile {
      position: relative;
      padding: 32px;
      border: 1px solid var(--border);
      border-radius: 28px;
      background: var(--bg-card);
      backdrop-filter: blur(30px) saturate(1.2);
      -webkit-backdrop-filter: blur(30px) saturate(1.2);
      box-shadow: var(--hi-edge), var(--shadow-2);
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      will-change: transform;
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out);
    }
    a.tile:hover {
      transform: translateY(-3px);
      border-color: var(--border-strong);
      box-shadow: var(--hi-edge), var(--shadow-3);
    }

    /* Layout: featured 4×2 + stats 2×2 on rows 1-2 → 3 fw tiles fall on row 3 aligned */
    .tile-featured { grid-column: span 4; grid-row: span 2; }
    .tile-stats    { grid-column: span 2; grid-row: span 2; }
    .tile-fw       { grid-column: span 2; }
    .tile-fundamentals { grid-column: span 6; }
    @media (max-width: 960px) {
      .bento { grid-template-columns: repeat(2, 1fr); }
      .tile-featured { grid-column: 1 / -1; grid-row: auto; }
      .tile-stats    { grid-column: 1 / -1; grid-row: auto; }
      .tile-fw       { grid-column: span 1; }
      .tile-fundamentals { grid-column: 1 / -1; }
    }
    @media (max-width: 560px) {
      .tile-fw { grid-column: 1 / -1; }
    }

    .tile-ey { color: var(--accent); }

    .tile-featured {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 340px;
    }
    .tile-featured .tile-ey { margin-bottom: 16px; }
    .tile-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(28px, 3.4vw, 40px);
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--text);
      margin: 0 0 14px;
      max-width: 18ch;
    }
    .tile-lead {
      color: var(--text-soft);
      font-size: 15px;
      line-height: 1.5;
      max-width: 52ch;
      margin: 0 0 18px;
    }
    .tile-cta { color: var(--accent); font-weight: 600; font-size: 15px; }

    .tile-stats {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 26px;
    }
    .stat { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .stat-num {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(40px, 4vw, 52px);
      line-height: 1;
      letter-spacing: -0.03em;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .stat-lbl { color: var(--text-dim); }

    .tile-fw {
      display: flex;
      flex-direction: column;
      min-height: 220px;
    }
    .fw-logo {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      margin-bottom: 20px;
      border-radius: 12px;
      background: color-mix(in oklab, var(--bg-inset) 80%, transparent);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      padding: 6px;
    }
    .fw-logo app-framework-logo,
    .fw-logo ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .fw-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 26px;
      letter-spacing: -0.015em;
      color: var(--text);
      margin: 0 0 6px;
    }
    .fw-tagline { color: var(--text-soft); font-size: 14px; margin: 0 0 auto; }
    .fw-meta { color: var(--text-dim); margin-top: 14px; }

    .tile-fundamentals { padding: 28px 32px; }
    .fund-head {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 18px;
    }
    .fund-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 22px;
      letter-spacing: -0.01em;
      color: var(--text);
      margin: 0;
    }
    .fund-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .fund-item {
      display: inline-flex;
      align-items: baseline;
      gap: 10px;
      padding: 10px 18px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: var(--bg-card);
      color: var(--text);
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: border-color var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-spring),
        color var(--dur) var(--ease-out);
    }
    .fund-item:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-2px);
    }
    .fund-count { color: var(--text-dim); }
  `,
})
export class LandingComponent {
  private readonly content = inject(ContentService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly frameworks = FRAMEWORKS;
  protected readonly fundamentals = FUNDAMENTALS;
  protected readonly tagline = TAGLINE;
  protected readonly label = (fw: Framework) => FRAMEWORK_LABEL[fw];

  protected readonly total = computed(() => this.content.catalogue.length);
  protected count(fw: Framework): number {
    return this.content.forFramework(fw).length;
  }
  protected readonly featuredPost = computed(() => this.content.blogPosts[0] ?? null);

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

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = this.host.nativeElement as HTMLElement;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cleanups: Array<() => void> = [];

      if (!reduce) {
        root.querySelectorAll<HTMLElement>('.stat-num[data-count]').forEach((el) => {
          const target = Number(el.dataset['count'] ?? '0');
          const io = new IntersectionObserver((entries, obs) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              obs.disconnect();
              const start = performance.now();
              const dur = 1100;
              const tick = (now: number) => {
                const p = Math.min((now - start) / dur, 1);
                el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
                if (p < 1) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }
          });
          io.observe(el);
          cleanups.push(() => io.disconnect());
        });
      }

      if (!reduce && matchMedia('(pointer: fine)').matches) {
        root.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
          const onMove = (ev: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const px = (ev.clientX - r.left) / r.width - 0.5;
            const py = (ev.clientY - r.top) / r.height - 0.5;
            el.style.transform = `perspective(1400px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-3px)`;
          };
          const onLeave = () => { el.style.transform = ''; };
          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerleave', onLeave);
          cleanups.push(() => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
          });
        });
      }

      destroyRef.onDestroy(() => cleanups.forEach((fn) => fn()));
    });
  }
}
