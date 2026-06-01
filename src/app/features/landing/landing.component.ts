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
};

/** Dimensional Dark landing — asymmetric bento grid with real depth (layered
 *  shadows, mouse-follow 3D tilt on the lead tile), magnetic buttons, scroll
 *  reveals and count-ups. Apple Vision / Stripe / Family.co — not flat. */
@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrameworkLogoComponent],
  template: `
    <main class="page">
      <!-- HERO — overflowing display title with gradient mesh visible through -->
      <section class="hero container">
        <a class="badge" routerLink="/blog/angular-22-ce-que-ca-change">
          <span class="badge-dot" aria-hidden="true"></span>
          <span class="badge-eyebrow label-mono">Nouveau</span>
          <span class="badge-text">Angular 22 est là — Signal Forms stables, zoneless par défaut</span>
          <span class="badge-arrow" aria-hidden="true">→</span>
        </a>

        <h1 class="display-2xl headline">
          Trois frameworks.<br />
          Une <span class="grad-text">discipline</span>.
        </h1>
        <p class="lead">
          Angular, React et Vue — du Junior au Senior. Exemples minimaux, pièges
          assumés, comparaisons côte à côte. Le terrain vrai.
        </p>

        <div class="cta">
          <a routerLink="/angular" class="btn primary magnetic">
            <span>Explorer Angular</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </a>
          <a routerLink="/compare" class="btn ghost magnetic">
            <span>Voir les comparatifs</span>
          </a>
        </div>
      </section>

      <!-- BENTO — asymmetric tiles, each with depth + hover lift + glow -->
      <section class="bento container">
        <!-- FEATURED tile — 2 cols × 2 rows, biggest, 3D tilt on mouse -->
        @if (featuredPost(); as fp) {
          <a class="tile tile-featured tilt" [routerLink]="['/blog', fp.slug]">
            <div class="tile-glow" aria-hidden="true"></div>
            <div class="tile-body">
              <span class="label-mono tile-eyebrow">À la une · Blog</span>
              <h2 class="tile-title display-l">{{ fp.title }}</h2>
              <p class="tile-lead">{{ fp.lead }}</p>
              <span class="tile-cta">
                Lire l'article
                <span class="tile-cta-arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </a>
        }

        <!-- STATS strip — three numbers, count-up on view -->
        <div class="tile tile-stats">
          <div class="stat">
            <span class="stat-num" [attr.data-count]="total()">0</span>
            <span class="stat-lbl label-mono">Articles</span>
          </div>
          <div class="stat-sep" aria-hidden="true"></div>
          <div class="stat">
            <span class="stat-num" data-count="7">0</span>
            <span class="stat-lbl label-mono">Sections</span>
          </div>
          <div class="stat-sep" aria-hidden="true"></div>
          <div class="stat">
            <span class="stat-num" data-count="4">0</span>
            <span class="stat-lbl label-mono">Niveaux</span>
          </div>
        </div>

        <!-- 3 FRAMEWORK tiles — distinct accents, logos, hover glow on the framework's color -->
        @for (fw of frameworks; track fw) {
          <a class="tile tile-fw" [attr.data-fw]="fw" [routerLink]="['/', fw]">
            <div class="tile-glow" aria-hidden="true"></div>
            <div class="tile-body">
              <app-framework-logo class="fw-logo" [framework]="fw" />
              <h3 class="fw-title">{{ label(fw) }}</h3>
              <p class="fw-tagline">{{ tagline[fw] }}</p>
              <span class="fw-meta label-mono">{{ count(fw) }} articles · 4 niveaux</span>
            </div>
          </a>
        }

        <!-- FUNDAMENTALS — wide bar with the 4 sections in a row -->
        <div class="tile tile-fundamentals">
          <div class="tile-glow" aria-hidden="true"></div>
          <div class="tile-body fund-body">
            <header class="fund-head">
              <span class="label-mono tile-eyebrow">Fondamentaux</span>
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
        </div>
      </section>

      <!-- PRINCIPLES — three rolling cards with subtle motion -->
      <section class="principles container">
        <header class="section-head">
          <span class="label-mono kicker grad-text">Méthode</span>
          <h2 class="section-h">Trois principes, sans détour.</h2>
        </header>
        <div class="principles-grid">
          <article class="principle">
            <span class="principle-num grad-text">01</span>
            <h3 class="h3">Clarté</h3>
            <p>Un concept à la fois, nommé pour ce qu'il est. Pas de jargon gratuit.</p>
          </article>
          <article class="principle">
            <span class="principle-num grad-text">02</span>
            <h3 class="h3">Profondeur</h3>
            <p>Trois niveaux assumés. Le Senior creuse là où le Junior pose.</p>
          </article>
          <article class="principle">
            <span class="principle-num grad-text">03</span>
            <h3 class="h3">Honnêteté</h3>
            <p>Pièges et trade-offs. On dit quand un outil ne vaut pas son coût.</p>
          </article>
        </div>
      </section>
    </main>
  `,
  styles: `
    .page {
      padding-block: clamp(20px, 4vw, 40px) clamp(60px, 10vw, 120px);
    }
    .container {
      max-width: 1200px;
    }

    /* ===== HERO ===== */
    .hero {
      padding-block: clamp(40px, 8vw, 100px) clamp(36px, 5vw, 64px);
      text-align: left;
      max-width: 1100px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px 6px 12px;
      margin-bottom: 28px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: color-mix(in oklab, var(--bg-elev) 70%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: var(--text-soft);
      font-size: 13px;
      text-decoration: none;
      box-shadow: var(--hi-edge), var(--shadow-1);
      transition: border-color var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out);
    }
    .badge:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: var(--hi-edge), 0 8px 28px -10px color-mix(in oklab, var(--accent) 60%, transparent);
    }
    .badge:hover .badge-arrow { transform: translateX(4px); color: var(--accent); }
    .badge-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent-3);
      box-shadow: 0 0 12px 1px var(--accent-3);
    }
    @media (prefers-reduced-motion: no-preference) {
      .badge-dot { animation: pulse-dot 2s var(--ease-out) infinite; }
      @keyframes pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.7; }
      }
    }
    .badge-eyebrow { color: var(--accent-3); }
    .badge-text { color: var(--text); font-weight: 500; }
    .badge-arrow {
      color: var(--text-dim);
      transition: transform var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
    }
    @media (max-width: 720px) {
      .badge-text { display: none; }
    }

    .headline {
      margin: 0 0 24px;
      max-width: 16ch;
    }
    .grad-text {
      background: var(--grad);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 32px color-mix(in oklab, var(--accent) 50%, transparent));
    }
    @media (prefers-reduced-motion: no-preference) {
      .grad-text { animation: grad-shift 8s var(--ease-in-out) infinite alternate; }
      @keyframes grad-shift {
        from { background-position: 0% 50%; }
        to { background-position: 100% 50%; }
      }
    }
    .lead {
      max-width: 580px;
      margin-bottom: 36px;
    }
    .cta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out);
      will-change: transform;
    }
    .btn.primary {
      color: #0a0816;
      background: var(--grad);
      background-size: 200% 100%;
      background-position: 0% 50%;
      box-shadow: var(--glow);
    }
    .btn.primary:hover {
      background-position: 100% 50%;
      transform: translateY(-2px);
    }
    .btn.primary .btn-arrow { transition: transform var(--dur) var(--ease-spring); }
    .btn.primary:hover .btn-arrow { transform: translateX(5px); }
    .btn.ghost {
      color: var(--text);
      border: 1px solid var(--border-strong);
      background: color-mix(in oklab, var(--bg-elev) 50%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: var(--hi-edge), var(--shadow-1);
    }
    .btn.ghost:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--hi-edge), 0 12px 32px -10px color-mix(in oklab, var(--accent) 50%, transparent);
    }

    /* ===== BENTO GRID ===== */
    .bento {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      grid-auto-rows: minmax(140px, auto);
      gap: 20px;
      margin-top: clamp(40px, 6vw, 80px);
    }
    .tile {
      position: relative;
      isolation: isolate;
      display: block;
      padding: clamp(22px, 2.4vw, 32px);
      border: 1px solid var(--border);
      border-radius: 20px;
      background: linear-gradient(180deg,
        color-mix(in oklab, var(--bg-card) 92%, white 8%) 0%,
        var(--bg-card) 100%);
      box-shadow: var(--hi-edge), var(--shadow-2);
      text-decoration: none;
      color: inherit;
      overflow: hidden;
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out);
      will-change: transform;
    }
    a.tile:hover {
      transform: translateY(-4px);
      border-color: color-mix(in oklab, var(--accent) 40%, var(--border));
      box-shadow: var(--hi-edge), var(--shadow-3),
        0 0 60px -12px color-mix(in oklab, var(--accent) 45%, transparent);
    }
    /* The colored bloom behind each tile, breathing on hover */
    .tile-glow {
      position: absolute;
      inset: -40% -20% auto auto;
      width: 80%;
      height: 80%;
      border-radius: 50%;
      background: radial-gradient(circle at center,
        color-mix(in oklab, var(--accent) 65%, transparent),
        transparent 60%);
      filter: blur(50px);
      opacity: 0.4;
      transition: opacity var(--dur) var(--ease-out);
      pointer-events: none;
      z-index: -1;
    }
    a.tile:hover .tile-glow { opacity: 0.75; }

    /* Grid placement */
    .tile-featured { grid-column: span 4; grid-row: span 2; }
    .tile-stats    { grid-column: span 2; }
    .tile-fw       { grid-column: span 2; }
    .tile-fundamentals { grid-column: span 6; }
    @media (max-width: 960px) {
      .bento { grid-template-columns: repeat(2, 1fr); }
      .tile-featured { grid-column: 1 / -1; grid-row: auto; }
      .tile-stats    { grid-column: 1 / -1; }
      .tile-fw       { grid-column: span 1; }
      .tile-fundamentals { grid-column: 1 / -1; }
    }
    @media (max-width: 560px) {
      .tile-fw { grid-column: 1 / -1; }
    }

    /* Featured tile */
    .tile-featured {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 320px;
    }
    .tile-eyebrow {
      color: var(--accent);
      margin-bottom: 14px;
      display: inline-block;
    }
    .tile-title {
      margin: 0 0 14px;
      color: var(--text);
      max-width: 18ch;
    }
    .tile-lead {
      color: var(--text-soft);
      max-width: 56ch;
      margin: 0 0 22px;
      font-size: 16px;
      line-height: 1.55;
    }
    .tile-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--accent);
      font-weight: 600;
      font-size: 15px;
    }
    .tile-cta-arrow {
      transition: transform var(--dur) var(--ease-spring);
    }
    a.tile:hover .tile-cta-arrow { transform: translateX(5px); }

    /* Stats tile */
    .tile-stats {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 8px;
      padding: 28px 24px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
    }
    .stat-num {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(34px, 4vw, 48px);
      line-height: 1;
      letter-spacing: -0.04em;
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-variant-numeric: tabular-nums;
    }
    .stat-lbl { color: var(--text-dim); }
    .stat-sep {
      width: 1px;
      height: 36px;
      background: var(--border);
    }

    /* Framework tile */
    .tile-fw {
      display: flex;
      flex-direction: column;
      min-height: 240px;
    }
    .tile-fw .tile-glow {
      background: radial-gradient(circle at center,
        color-mix(in oklab, var(--accent) 70%, transparent),
        transparent 60%);
    }
    .tile-fw[data-fw="angular"] { --accent: #ff6c8a; }
    .tile-fw[data-fw="react"]   { --accent: #6ad9ff; }
    .tile-fw[data-fw="vue"]     { --accent: #00e5c0; }
    .fw-logo { width: 36px; height: 36px; margin-bottom: 18px; }
    .fw-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 24px;
      letter-spacing: -0.02em;
      color: var(--text);
      margin: 0 0 6px;
    }
    .fw-tagline {
      color: var(--text-soft);
      font-size: 14px;
      margin: 0;
      flex: 1;
    }
    .fw-meta { color: var(--text-dim); margin-top: 12px; }

    /* Fundamentals strip */
    .tile-fundamentals { padding: 28px clamp(24px, 3vw, 36px); }
    .fund-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 28px;
      flex-wrap: wrap;
    }
    .fund-head { flex: 0 1 280px; }
    .fund-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.01em;
      color: var(--text);
      margin: 4px 0 0;
    }
    .fund-list {
      list-style: none;
      margin: 0; padding: 0;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
      justify-content: flex-end;
    }
    .fund-item {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: color-mix(in oklab, var(--bg-inset) 50%, transparent);
      color: var(--text);
      font-weight: 600;
      font-size: 14px;
      transition: border-color var(--dur) var(--ease-out),
        background var(--dur) var(--ease-out),
        transform var(--dur) var(--ease-spring);
    }
    .fund-item:hover {
      border-color: var(--accent);
      background: color-mix(in oklab, var(--accent) 14%, var(--bg-inset));
      transform: translateY(-2px);
    }
    .fund-count { color: var(--text-dim); }

    /* ===== PRINCIPLES ===== */
    .principles {
      margin-top: clamp(80px, 12vw, 140px);
    }
    .section-head {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 36px;
    }
    .kicker { font-size: 12px; }
    .principles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .principle {
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: linear-gradient(180deg,
        color-mix(in oklab, var(--bg-card) 92%, white 8%) 0%,
        var(--bg-card) 100%);
      box-shadow: var(--hi-edge), var(--shadow-1);
      transition: transform var(--dur) var(--ease-spring),
        box-shadow var(--dur) var(--ease-out);
    }
    .principle:hover {
      transform: translateY(-3px);
      box-shadow: var(--hi-edge), var(--shadow-2);
    }
    .principle-num {
      display: block;
      font-family: var(--font-mono);
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }
    .principle p {
      color: var(--text-soft);
      margin-top: 8px;
      font-size: 14.5px;
      line-height: 1.55;
    }
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

      // ---- Count-up on stats ----
      if (!reduce) {
        root.querySelectorAll<HTMLElement>('.stat-num[data-count]').forEach((el) => {
          const target = Number(el.dataset['count'] ?? '0');
          const io = new IntersectionObserver((entries, obs) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              obs.disconnect();
              const start = performance.now();
              const dur = 1200;
              const tick = (now: number) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = String(Math.round(target * eased));
                if (p < 1) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }
          });
          io.observe(el);
          cleanups.push(() => io.disconnect());
        });
      }

      // ---- Magnetic buttons (mouse-follow translation) ----
      if (!reduce && matchMedia('(pointer: fine)').matches) {
        root.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
          const onMove = (ev: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const dx = ev.clientX - (r.left + r.width / 2);
            const dy = ev.clientY - (r.top + r.height / 2);
            el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
          };
          const onLeave = () => { el.style.transform = ''; };
          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerleave', onLeave);
          cleanups.push(() => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
          });
        });

        // ---- 3D tilt on .tilt cards (mouse-follow rotateX/rotateY) ----
        root.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
          const onMove = (ev: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const px = (ev.clientX - r.left) / r.width - 0.5;
            const py = (ev.clientY - r.top) / r.height - 0.5;
            const rx = (-py * 6).toFixed(2);
            const ry = (px * 8).toFixed(2);
            el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
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
