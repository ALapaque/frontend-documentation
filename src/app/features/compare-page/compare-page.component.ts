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
      <section class="container head reveal">
        <div class="head-tile tile tile-ink">
          <app-eyebrow>Cross-framework</app-eyebrow>
          <h1 class="display-l hl">{{ d.meta.title }}</h1>
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
    .head-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
      padding: clamp(28px, 4vw, 48px);
    }
    .head-tile .hl {
      color: var(--on-ink);
    }
    .head-tile .lead {
      color: var(--on-ink-soft);
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
      font-weight: 700;
      font-size: 30px;
      letter-spacing: -0.02em;
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
      border-top: 2px solid var(--border-strong);
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }
    .rel {
      padding: 7px 13px;
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-pill);
      background: var(--bg-card);
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
      box-shadow: var(--shadow-1);
      transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out),
        background var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
    }
    .rel:hover {
      transform: translate(-2px, -2px);
      box-shadow: var(--shadow-2);
      background: var(--accent);
      color: #fff;
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
