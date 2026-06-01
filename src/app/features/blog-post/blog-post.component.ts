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
import { OrnamentComponent } from '../../ui/ornament.component';
import { CalloutComponent } from '../../ui/callout.component';
import { CodeBlockComponent } from '../../ui/code-block.component';
import { CheatGridComponent } from '../../ui/cheat-grid.component';
import { TwoColCompareComponent } from '../../ui/two-col-compare.component';
import { SafeHtmlPipe } from '../../core/safe-html.pipe';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { FRAMEWORK_LABEL } from '../../core/levels';
import type { CompiledBlog, ModuleMeta } from '../../content/content.types';

interface RelatedView {
  readonly label: string;
  readonly link: string[];
}

/** Editorial article layout for blog posts: oversized eyebrow + title, cover
 *  art, byline, wide prose. Pushes the Bold Modern theme further than the
 *  reference module layout. */
@Component({
  selector: 'app-blog-post',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-cover]': 'doc()?.meta?.cover' },
  imports: [
    RouterLink,
    EyebrowComponent,
    OrnamentComponent,
    CalloutComponent,
    CodeBlockComponent,
    CheatGridComponent,
    TwoColCompareComponent,
    SafeHtmlPipe,
  ],
  template: `
    @let d = doc();
    @if (d) {
      <header class="cover">
        <div class="container head">
          <a routerLink="/blog" class="back label-mono">← Blog</a>
          <app-eyebrow>Blog · {{ formattedDate(d.meta.date) }}</app-eyebrow>
          <h1 class="display-xl">{{ d.meta.title }}</h1>
          <p class="lead">{{ d.meta.lead }}</p>
          <div class="byline label-mono">
            <span>{{ d.meta.author }}</span>
            @if (d.meta.tags.length) {
              <span class="dot" aria-hidden="true">·</span>
              <span class="tags">
                @for (t of d.meta.tags; track t) {
                  <span class="tag">#{{ t }}</span>
                }
              </span>
            }
          </div>
        </div>
        <div class="cover-art" aria-hidden="true"></div>
      </header>

      <app-ornament />

      <article class="container body">
        @for (block of d.blocks; track $index) {
          @switch (block.kind) {
            @case ('heading') {
              @if (block.depth === 2) {
                <h2 [id]="block.id" class="sec">{{ block.text }}</h2>
              } @else {
                <h3 [id]="block.id" class="h3">{{ block.text }}</h3>
              }
            }
            @case ('prose') {
              <div class="prose wide" [innerHTML]="block.html | safeHtml"></div>
            }
            @case ('code') {
              <app-code-block
                [code]="block.code"
                [lang]="block.lang"
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
          }
        }

        @if (related().length) {
          <footer class="end">
            <span class="label-mono dim">Pour creuser</span>
            <div class="links">
              @for (r of related(); track r.label) {
                <a [routerLink]="r.link" class="rel">{{ r.label }}</a>
              }
            </div>
          </footer>
        }
      </article>
    } @else {
      <section class="container section reveal">
        <app-eyebrow>Blog</app-eyebrow>
        <h1 class="display-l">Article introuvable</h1>
        <p class="lead">« {{ slug() }} » n'existe pas.</p>
      </section>
    }
  `,
  styles: `
    /* Editorial cover: warm tint + a soft brand-coloured wash that pops on the
       light canvas. Cover variants (data-cover) override the wash. */
    .cover {
      position: relative;
      isolation: isolate;
      padding-block: clamp(64px, 11vw, 140px) clamp(40px, 6vw, 64px);
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }
    :host([data-cover="angular-v22"]) .cover-art {
      background:
        radial-gradient(50vmax 50vmax at 110% -10%,
          color-mix(in oklab, #dd0031 50%, transparent), transparent 60%),
        radial-gradient(36vmax 36vmax at -10% 110%,
          color-mix(in oklab, #ff5a36 38%, transparent), transparent 65%);
    }
    :host([data-cover="vue-vapor"]) .cover-art {
      background:
        radial-gradient(50vmax 50vmax at 110% -10%,
          color-mix(in oklab, #12a474 50%, transparent), transparent 60%),
        radial-gradient(36vmax 36vmax at -10% 110%,
          color-mix(in oklab, #0f7a44 38%, transparent), transparent 65%);
    }
    .cover-art {
      position: absolute;
      inset: 0;
      z-index: -1;
      filter: blur(40px) saturate(1.2);
      opacity: 0.7;
      pointer-events: none;
    }
    .head {
      display: flex;
      flex-direction: column;
      gap: 18px;
      align-items: flex-start;
    }
    .back {
      color: var(--text-soft);
      transition: color var(--dur) var(--ease-out);
    }
    .back:hover {
      color: var(--text);
    }
    .display-xl {
      max-width: 900px;
      letter-spacing: -0.05em;
    }
    .lead {
      max-width: 720px;
      font-size: clamp(18px, 2.2vw, 22px);
      color: var(--text-soft);
    }
    .byline {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-dim);
      margin-top: 6px;
    }
    .byline .dot {
      opacity: 0.6;
    }
    .tags {
      display: inline-flex;
      gap: 8px;
    }
    .tag {
      color: var(--text-soft);
    }
    .body {
      max-width: 760px;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-block: 56px 80px;
      min-width: 0;
    }
    /* Flex children default to min-width: auto, which lets a wide code block
       (with overflow-x: auto inside) push the article wider than the viewport.
       Constrain every direct child to the body's width — code blocks then
       scroll horizontally inside their own frame as intended. */
    .body > * {
      max-width: 100%;
      min-width: 0;
    }
    .body .sec {
      font-family: var(--font-display);
      font-weight: 800;
      letter-spacing: -0.035em;
      font-size: clamp(28px, 3.8vw, 40px);
      line-height: 1.05;
      margin-top: 32px;
      scroll-margin-top: calc(var(--header-h) + 24px);
    }
    .body .sec::before {
      content: '§ ';
      color: var(--accent);
    }
    .body h3 {
      margin-top: 14px;
    }
    .prose.wide {
      max-width: none;
      font-size: 18px;
      line-height: 1.75;
    }
    .end {
      margin-top: 36px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .rel {
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      font-size: 14px;
      color: var(--text-soft);
      background: var(--bg-card);
      transition: color var(--dur) var(--ease-out),
        border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .rel:hover {
      color: var(--text);
      border-color: var(--accent);
      box-shadow: var(--shadow-2);
    }
    .dim {
      color: var(--text-dim);
    }
  `,
})
export class BlogPostComponent {
  private readonly content = inject(ContentService);
  readonly doc = input<CompiledBlog | null>(null);
  readonly slug = input<string>('');

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const d = this.doc();
      if (!d) return;
      seo.set({
        title: d.meta.seoTitle || d.meta.title,
        description: d.meta.seoDescription || d.meta.lead,
        path: `/blog/${d.meta.slug}`,
        type: 'article',
      });
    });
  }

  protected readonly formattedDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(iso));

  protected readonly related = computed<RelatedView[]>(() => {
    const d = this.doc();
    if (!d) return [];
    return d.meta.related
      .map((r) => {
        const target: ModuleMeta | undefined = this.content.byFrameworkSlug(r.framework, r.slug);
        if (!target) return null;
        return {
          label: `${FRAMEWORK_LABEL[target.framework]} · ${target.title}`,
          link: ['/', target.framework, target.level, target.slug],
        };
      })
      .filter((v): v is RelatedView => v !== null);
  });
}
