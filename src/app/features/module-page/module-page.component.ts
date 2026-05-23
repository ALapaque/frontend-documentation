import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { LevelChipComponent } from '../../ui/level-chip.component';
import { CalloutComponent } from '../../ui/callout.component';
import { CodeBlockComponent } from '../../ui/code-block.component';
import { TwoColCompareComponent } from '../../ui/two-col-compare.component';
import { CheatGridComponent } from '../../ui/cheat-grid.component';
import { CssDemoComponent } from '../../ui/css-demo.component';
import { BreadcrumbComponent, type Crumb } from '../../ui/breadcrumb.component';
import { TocSidebarComponent } from '../../ui/toc-sidebar.component';
import { SafeHtmlPipe } from '../../core/safe-html.pipe';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_NAME, REPO_CONTENT } from '../../core/site';
import { FRAMEWORK_LABEL } from '../../core/levels';
import type { CompiledModule, ModuleMeta } from '../../content/content.types';

interface RelatedView {
  readonly label: string;
  readonly link: string[];
}

@Component({
  selector: 'app-module-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    EyebrowComponent,
    LevelChipComponent,
    CalloutComponent,
    CodeBlockComponent,
    TwoColCompareComponent,
    CheatGridComponent,
    CssDemoComponent,
    BreadcrumbComponent,
    TocSidebarComponent,
    SafeHtmlPipe,
  ],
  template: `
    @let mod = module();
    @if (mod && !mod.meta.stub) {
      <article class="container layout reveal">
        <header class="head glass" style="view-transition-name: module-hero">
          <app-breadcrumb [items]="crumbs(mod.meta)" />
          <app-eyebrow>Module {{ orderLabel(mod.meta.order) }}</app-eyebrow>
          <h1 class="display-l">{{ mod.meta.title }}</h1>
          <p class="lead">{{ mod.meta.seoDescription }}</p>
          <div class="meta">
            <app-level-chip [level]="mod.meta.level" />
            @if (mod.meta.duration) {
              <span class="label-mono dim">{{ mod.meta.duration }} min</span>
            }
            @if (mod.meta.prerequisites.length) {
              <span class="label-mono dim">Prérequis : {{ mod.meta.prerequisites.join(' · ') }}</span>
            }
          </div>
        </header>

        @if (mod.toc.length) {
          <aside class="toc">
            <app-toc-sidebar [toc]="mod.toc" />
          </aside>
        }

        <div class="body">
          @for (block of mod.blocks; track $index) {
            @switch (block.kind) {
              @case ('heading') {
                @if (block.depth === 2) {
                  <h2 [id]="block.id" class="sec">{{ block.text }}</h2>
                } @else {
                  <h3 [id]="block.id" class="h3 sub">{{ block.text }}</h3>
                }
              }
              @case ('prose') {
                <div class="prose" [innerHTML]="block.html | safeHtml"></div>
              }
              @case ('code') {
                <app-code-block
                  [code]="block.code"
                  [lang]="block.lang"
                  [filename]="block.filename ?? ''"
                  [highlightedHtml]="block.html"
                />
              }
              @case ('callout') {
                <app-callout [type]="block.variant">
                  <div [innerHTML]="block.html | safeHtml"></div>
                </app-callout>
              }
              @case ('compare') {
                <app-two-col-compare [bad]="block.bad" [good]="block.good" />
              }
              @case ('cheatsheet') {
                <app-cheat-grid [items]="block.items" />
              }
              @case ('demo') {
                <app-css-demo [kind]="block.demo" />
              }
            }
          }

          <footer class="end">
            <nav class="pager" aria-label="Navigation des modules">
              @if (prev(); as p) {
                <a class="page prev" [routerLink]="['/', p.framework, p.level, p.slug]">
                  <span class="label-mono dim">← Précédent</span>
                  <span class="t">{{ p.title }}</span>
                </a>
              } @else {
                <span></span>
              }
              @if (next(); as n) {
                <a class="page next" [routerLink]="['/', n.framework, n.level, n.slug]">
                  <span class="label-mono dim">Suivant →</span>
                  <span class="t">{{ n.title }}</span>
                </a>
              }
            </nav>

            @if (related().length) {
              <div class="related">
                <span class="label-mono dim">Voir aussi</span>
                <div class="links">
                  @for (r of related(); track r.label) {
                    <a [routerLink]="r.link" class="rel">{{ r.label }}</a>
                  }
                </div>
              </div>
            }

            <a [href]="sourceUrl(mod.meta)" target="_blank" rel="noopener" class="src label-mono">
              Voir la source ↗
            </a>
          </footer>
        </div>
      </article>
    } @else if (mod && mod.meta.stub) {
      <section class="container section reveal">
        <app-breadcrumb [items]="crumbs(mod.meta)" />
        <app-eyebrow>À venir</app-eyebrow>
        <h1 class="display-l">{{ mod.meta.title }}</h1>
        <p class="lead">{{ mod.meta.seoDescription }}</p>
        <p class="dim">Ce module est planifié mais pas encore rédigé.</p>
      </section>
    } @else {
      <section class="container section reveal">
        <app-eyebrow>Introuvable</app-eyebrow>
        <h1 class="display-l">Module inconnu</h1>
        <p class="lead">
          <code class="inline">/{{ framework() }}/{{ level() }}/{{ slug() }}</code>
          ne correspond à aucun module.
        </p>
      </section>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px 48px;
      padding-block: clamp(40px, 8vw, 80px);
    }
    .head {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: clamp(20px, 3vw, 32px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--glass);
      backdrop-filter: blur(22px) saturate(1.4);
      -webkit-backdrop-filter: blur(22px) saturate(1.4);
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .dim {
      color: var(--text-dim);
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }
    .body .sec {
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 28px;
      letter-spacing: -0.01em;
      margin-top: 28px;
      scroll-margin-top: calc(var(--header-h) + 24px);
    }
    .body .sec::before {
      content: '§ ';
      color: var(--accent);
    }
    .body .h3.sub {
      margin-top: 12px;
      scroll-margin-top: calc(var(--header-h) + 24px);
    }
    .end {
      margin-top: 48px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .pager {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .page {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--glass);
      backdrop-filter: blur(18px) saturate(1.3);
      -webkit-backdrop-filter: blur(18px) saturate(1.3);
      transition: transform var(--dur) var(--ease-spring),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .page:hover {
      transform: translateY(-4px);
      border-color: color-mix(in oklab, var(--accent) 45%, transparent);
      box-shadow: var(--glow);
    }
    .page.next {
      text-align: right;
    }
    .page .t {
      font-family: var(--font-display);
      font-size: 18px;
      color: var(--text);
    }
    .related .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .rel {
      padding: 7px 13px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      font-size: 14px;
      color: var(--text-soft);
      background: var(--glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: color var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .rel:hover {
      color: var(--accent-2);
      border-color: color-mix(in oklab, var(--accent) 45%, transparent);
      box-shadow: var(--glow);
    }
    .src {
      color: var(--text-dim);
      width: fit-content;
      transition: color var(--dur) var(--ease-out);
    }
    .src:hover {
      color: var(--accent);
    }

    @media (min-width: 1040px) {
      .layout {
        grid-template-columns: minmax(0, 1fr) 240px;
        grid-template-areas:
          'head toc'
          'body toc';
        align-items: start;
      }
      .head {
        grid-area: head;
      }
      .body {
        grid-area: body;
      }
      .toc {
        grid-area: toc;
        position: sticky;
        top: calc(var(--header-h) + 24px);
      }
    }
  `,
})
export class ModulePageComponent {
  private readonly content = inject(ContentService);

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const mod = this.module();
      if (!mod) return;
      const { framework, level, slug, title, seoDescription, updated } = mod.meta;
      const path = `/${framework}/${level}/${slug}`;
      seo.set({
        title: mod.meta.seoTitle || title,
        description: seoDescription,
        path,
        type: 'article',
        image: `/og/${framework}-${level}-${slug}.png`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: title,
          description: seoDescription,
          datePublished: updated,
          dateModified: updated,
          author: { '@type': 'Organization', name: SITE_NAME },
          keywords: [framework, level].join(', '),
          proficiencyLevel: level,
        },
      });
    });
  }

  readonly module = input<CompiledModule | null>(null);
  readonly framework = input<string>('');
  readonly level = input<string>('');
  readonly slug = input<string>('');

  private readonly siblings = computed(() => {
    const mod = this.module();
    return mod ? this.content.siblings(mod.meta.framework, mod.meta.level) : [];
  });

  private readonly currentIndex = computed(() => {
    const mod = this.module();
    return mod ? this.siblings().findIndex((s) => s.slug === mod.meta.slug) : -1;
  });

  protected readonly prev = computed<ModuleMeta | null>(() => {
    const i = this.currentIndex();
    return i > 0 ? this.siblings()[i - 1] : null;
  });

  protected readonly next = computed<ModuleMeta | null>(() => {
    const i = this.currentIndex();
    return i >= 0 && i < this.siblings().length - 1 ? this.siblings()[i + 1] : null;
  });

  protected readonly related = computed<RelatedView[]>(() => {
    const mod = this.module();
    if (!mod) return [];
    return mod.meta.related
      .map((r) => {
        const target = this.content.byFrameworkSlug(r.framework, r.slug);
        if (!target) return null;
        return {
          label: `${FRAMEWORK_LABEL[target.framework]} · ${target.title}`,
          link: ['/', target.framework, target.level, target.slug],
        };
      })
      .filter((v): v is RelatedView => v !== null);
  });

  protected crumbs(meta: ModuleMeta): Crumb[] {
    return [
      { label: FRAMEWORK_LABEL[meta.framework], link: `/${meta.framework}` },
      { label: meta.level },
      { label: meta.title },
    ];
  }

  protected sourceUrl(meta: ModuleMeta): string {
    return `${REPO_CONTENT}/${meta.framework}/${meta.level}/${meta.slug}.md`;
  }

  protected orderLabel(order: number): string {
    return order.toString().padStart(2, '0');
  }
}
