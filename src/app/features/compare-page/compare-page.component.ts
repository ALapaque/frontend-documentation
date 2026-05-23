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
import { TriCodeComponent } from '../../ui/tri-code.component';
import { SafeHtmlPipe } from '../../core/safe-html.pipe';
import { ContentService } from '../../content/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { FRAMEWORK_LABEL } from '../../core/levels';
import type { CompiledCompare, ModuleMeta } from '../../content/content.types';

interface RelatedView {
  readonly label: string;
  readonly link: string[];
}

@Component({
  selector: 'app-compare-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    EyebrowComponent,
    OrnamentComponent,
    CalloutComponent,
    CodeBlockComponent,
    TriCodeComponent,
    SafeHtmlPipe,
  ],
  template: `
    @let d = doc();
    @if (d) {
      <section class="container head scroll-reveal">
        <div class="head-card glass" style="view-transition-name: compare-hero">
          <app-eyebrow>Cross-framework</app-eyebrow>
          <h1 class="display-l">{{ d.meta.title }}</h1>
          <p class="lead">{{ d.meta.lead }}</p>
        </div>
      </section>

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
              <app-code-block [code]="block.code" [lang]="block.lang" [highlightedHtml]="block.html" />
            }
            @case ('callout') {
              <app-callout [type]="block.variant">
                <div [innerHTML]="block.html | safeHtml"></div>
              </app-callout>
            }
            @case ('tricode') {
              <app-tri-code
                [title]="block.title"
                [angular]="block.angular"
                [react]="block.react"
                [vue]="block.vue"
              />
            }
          }
        }

        @if (related().length) {
          <footer class="end">
            <span class="label-mono dim">Pour aller plus loin</span>
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
        <app-eyebrow>Cross-framework</app-eyebrow>
        <h1 class="display-l">Comparatif inconnu</h1>
        <p class="lead">« {{ topic() }} » n'existe pas encore.</p>
      </section>
    }
  `,
  styles: `
    .head {
      padding-top: clamp(48px, 9vw, 96px);
    }
    .head-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: flex-start;
      padding: clamp(24px, 4vw, 40px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--glass);
      backdrop-filter: blur(22px) saturate(1.4);
      -webkit-backdrop-filter: blur(22px) saturate(1.4);
    }
    .head-card h1 {
      margin: 0;
    }
    .lead {
      max-width: 640px;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding-block: 48px;
    }
    .body .sec {
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 28px;
      margin-top: 24px;
      scroll-margin-top: calc(var(--header-h) + 24px);
    }
    .body .sec::before {
      content: '§ ';
      color: var(--accent);
    }
    .prose.wide {
      max-width: none;
    }
    .end {
      margin-top: 32px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
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
    .dim {
      color: var(--text-dim);
    }
  `,
})
export class ComparePageComponent {
  private readonly content = inject(ContentService);
  readonly doc = input<CompiledCompare | null>(null);
  readonly topic = input<string>('');

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const d = this.doc();
      if (!d) return;
      seo.set({
        title: d.meta.seoTitle || d.meta.title,
        description: d.meta.seoDescription || d.meta.lead,
        path: `/compare/${d.meta.topic}`,
        type: 'article',
      });
    });
  }

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
