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
import { FrameworkCardComponent } from '../../ui/framework-card.component';
import { ModuleCardComponent } from '../../ui/module-card.component';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_TAGLINE } from '../../core/site';
import { FRAMEWORKS, type Framework, type Level } from '../../core/levels';
import type { ModuleMeta } from '../../content/content.types';

const TAGLINE: Record<Framework, string> = {
  angular: 'Signals, zoneless, SSR. La discipline structurée.',
  react: 'RSC, compiler, concurrent. Le pragmatisme à grande échelle.',
  vue: 'Reactivity, Vapor, Nuxt. La progressivité élégante.',
};

const FEATURED: ReadonlyArray<[Framework, Level, string]> = [
  ['angular', 'medior', 'signals'],
  ['angular', 'junior', 'lifecycle'],
  ['react', 'senior', 'rsc'],
  ['vue', 'senior', 'vapor-mode'],
  ['angular', 'senior', 'ssr-hydration'],
  ['react', 'medior', 'server-state'],
];

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FrameworkCardComponent, ModuleCardComponent],
  template: `
    <section class="hero">
      <div class="beams" aria-hidden="true">
        <span class="beam b1"></span>
        <span class="beam b2"></span>
      </div>
      <div class="container hero-in">
        <span class="badge">
          <span class="dot" aria-hidden="true"></span>
          Practical Docs · 2026
        </span>
        <h1 class="display-2xl headline">
          <span class="line"><span>Three frameworks.</span></span>
          <span class="line"><span>One <em class="accent">discipline</em>.</span></span>
        </h1>
        <p class="lead">
          Angular, React et Vue — expliqués du Junior au Senior. Pas de bullshit,
          des exemples minimaux, des diagrammes là où le texte échoue.
        </p>
        <div class="cta">
          <a routerLink="/angular" class="btn primary magnetic">Explorer Angular</a>
          <a routerLink="/compare/state-management" class="btn ghost magnetic">
            Voir les comparatifs
          </a>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="num tnum" [attr.data-count]="total()">{{ total() }}</span>
            <span class="lbl label-mono">Modules</span>
          </div>
          <div class="stat">
            <span class="num tnum" data-count="3">3</span>
            <span class="lbl label-mono">Frameworks</span>
          </div>
          <div class="stat">
            <span class="num tnum" data-count="4">4</span>
            <span class="lbl label-mono">Niveaux</span>
          </div>
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="cards stagger">
        @for (fw of frameworks; track fw; let i = $index) {
          <app-framework-card
            [framework]="fw"
            [tagline]="tagline[fw]"
            [count]="count(fw)"
            [style.--i]="i"
          />
        }
      </div>
    </section>

    <section class="container section">
      <header class="sec-head scroll-reveal">
        <span class="label-mono kicker">Sélection</span>
        <h2 class="section-h">À la <span class="accent">une</span></h2>
      </header>
      <div class="featured stagger">
        @for (m of featured(); track m.slug + m.framework; let first = $first; let i = $index) {
          <div class="feat" [class.lead-cell]="first" [style.--i]="i">
            <app-module-card [meta]="m" [showFramework]="true" />
          </div>
        }
      </div>
    </section>

    <section class="container section">
      <div class="philosophy glass scroll-reveal">
        <div class="col">
          <span class="num-mono">01</span>
          <h3 class="h3">Clarté</h3>
          <p>Un concept à la fois, nommé pour ce qu'il est. Pas de jargon gratuit, pas de détour.</p>
        </div>
        <div class="col">
          <span class="num-mono">02</span>
          <h3 class="h3">Profondeur</h3>
          <p>Trois niveaux assumés. Le Senior creuse l'implémentation là où le Junior pose les fondations.</p>
        </div>
        <div class="col">
          <span class="num-mono">03</span>
          <h3 class="h3">Honnêteté</h3>
          <p>Les pièges, les trade-offs, les idées reçues. On dit quand un outil ne vaut pas son coût.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* ---------- HERO ---------- */
    .hero {
      position: relative;
      padding-block: clamp(80px, 16vh, 200px) clamp(40px, 8vw, 90px);
      overflow: clip;
    }
    .beams {
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
    }
    .beam {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.5;
    }
    .beam.b1 {
      width: 40vmax;
      height: 40vmax;
      top: -16vmax;
      left: 40%;
      background: radial-gradient(circle, color-mix(in oklab, var(--accent) 60%, transparent), transparent 60%);
      animation: float1 18s var(--ease-in-out) infinite alternate;
    }
    .beam.b2 {
      width: 30vmax;
      height: 30vmax;
      top: 6vmax;
      left: 6%;
      background: radial-gradient(circle, color-mix(in oklab, var(--accent-2) 55%, transparent), transparent 60%);
      animation: float2 22s var(--ease-in-out) infinite alternate;
    }
    @keyframes float1 {
      to {
        transform: translate(-8%, 10%) scale(1.15);
      }
    }
    @keyframes float2 {
      to {
        transform: translate(10%, -8%) scale(1.2);
      }
    }
    .hero-in {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 26px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      background: var(--glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-soft);
      animation: rise 0.7s var(--ease-out) both;
    }
    .badge .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent-2);
      box-shadow: 0 0 12px 1px var(--accent-2);
      animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.4;
        transform: scale(0.8);
      }
    }
    .headline {
      margin: 0;
      max-width: 16ch;
    }
    .headline .line {
      display: block;
      overflow: hidden;
    }
    .headline .line > * {
      display: inline-block;
      transform: translateY(110%);
      animation: lineUp 0.9s var(--ease-out) forwards;
    }
    .headline .line:nth-child(1) > * {
      animation-delay: 0.12s;
    }
    .headline .line:nth-child(2) > * {
      animation-delay: 0.26s;
    }
    .accent em {
      font-style: normal;
    }
    @keyframes lineUp {
      to {
        transform: none;
      }
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
    }
    .lead {
      max-width: 600px;
      animation: rise 0.8s 0.4s var(--ease-out) both;
    }
    .cta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      animation: rise 0.8s 0.5s var(--ease-out) both;
    }
    .btn {
      position: relative;
      padding: 14px 26px;
      border-radius: var(--radius-pill);
      font-size: 15px;
      font-weight: 600;
      will-change: transform;
      transition: transform var(--dur) var(--ease-spring), box-shadow var(--dur) var(--ease-out);
    }
    .btn.primary {
      color: #08070c;
      background: var(--grad);
      box-shadow: var(--glow);
    }
    .btn.primary:hover {
      box-shadow: var(--glow), 0 10px 40px -8px color-mix(in oklab, var(--accent) 60%, transparent);
    }
    .btn.ghost {
      color: var(--text);
      border: 1px solid var(--border-strong);
      background: var(--glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .btn.ghost:hover {
      border-color: color-mix(in oklab, var(--accent) 50%, transparent);
    }
    .stats {
      display: flex;
      gap: 40px;
      margin-top: 14px;
      animation: rise 0.8s 0.62s var(--ease-out) both;
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat .num {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(30px, 4vw, 44px);
      line-height: 1;
      letter-spacing: -0.03em;
      background: var(--grad);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat .lbl {
      color: var(--text-dim);
    }

    /* ---------- GRIDS ---------- */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .sec-head {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 28px;
    }
    .kicker {
      color: var(--accent-2);
    }
    .featured {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }
    .featured .feat {
      min-width: 0;
    }
    .featured .lead-cell {
      grid-column: span 1;
      grid-row: span 2;
    }
    .featured .lead-cell ::ng-deep .card {
      justify-content: flex-start;
      gap: 16px;
    }

    /* ---------- PHILOSOPHY ---------- */
    .philosophy {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      padding: clamp(28px, 4vw, 48px);
      border-radius: var(--radius-xl);
    }
    .philosophy .col {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .philosophy .num-mono {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--accent);
      letter-spacing: 0.1em;
    }
    .philosophy p {
      color: var(--text-soft);
      max-width: 36ch;
    }

    @media (max-width: 860px) {
      .featured,
      .philosophy {
        grid-template-columns: 1fr;
      }
      .featured .lead-cell {
        grid-row: span 1;
      }
      .stats {
        gap: 28px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .headline .line > *,
      .badge,
      .lead,
      .cta,
      .stats {
        animation: none;
      }
      .headline .line > * {
        transform: none;
      }
      .beam {
        animation: none;
      }
    }
  `,
})
export class LandingComponent {
  private readonly content = inject(ContentService);
  private readonly host = inject(ElementRef);
  protected readonly frameworks = FRAMEWORKS;
  protected readonly tagline = TAGLINE;

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

      // Count-up stats
      if (!reduce) {
        root.querySelectorAll<HTMLElement>('.num[data-count]').forEach((el) => {
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

      // Magnetic buttons
      if (!reduce && matchMedia('(pointer: fine)').matches) {
        root.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
          const onMove = (ev: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const dx = ev.clientX - (r.left + r.width / 2);
            const dy = ev.clientY - (r.top + r.height / 2);
            el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
          };
          const onLeave = () => (el.style.transform = '');
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

  protected readonly total = computed(() => this.content.catalogue.length);

  protected count(fw: Framework): number {
    return this.content.forFramework(fw).length;
  }

  protected readonly featured = computed<ModuleMeta[]>(() =>
    FEATURED.map(([fw, lvl, slug]) => this.content.meta(fw, lvl, slug)).filter(
      (m): m is ModuleMeta => m !== undefined,
    ),
  );
}
