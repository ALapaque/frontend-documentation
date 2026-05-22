import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { LevelChipComponent } from '../../ui/level-chip.component';
import { CalloutComponent } from '../../ui/callout.component';
import { CodeBlockComponent } from '../../ui/code-block.component';
import { TwoColCompareComponent } from '../../ui/two-col-compare.component';
import { CheatGridComponent } from '../../ui/cheat-grid.component';
import { SafeHtmlPipe } from '../../core/safe-html.pipe';
import { FRAMEWORK_LABEL, isFramework, type Framework } from '../../core/levels';
import type { CompiledModule } from '../../content/content.types';

@Component({
  selector: 'app-module-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EyebrowComponent,
    LevelChipComponent,
    CalloutComponent,
    CodeBlockComponent,
    TwoColCompareComponent,
    CheatGridComponent,
    SafeHtmlPipe,
  ],
  template: `
    @let mod = module();
    @if (mod && !mod.meta.stub) {
      <article class="container layout reveal">
        <header class="head">
          <p class="label-mono crumb">
            {{ frameworkLabel() }} · {{ mod.meta.level }} · {{ mod.meta.title }}
          </p>
          <app-eyebrow>Module {{ orderLabel(mod.meta.order) }}</app-eyebrow>
          <h1 class="display-l">{{ mod.meta.title }}</h1>
          <p class="lead">{{ mod.meta.seoDescription }}</p>
          <div class="meta">
            <app-level-chip [level]="mod.meta.level" />
            @if (mod.meta.duration) {
              <span class="label-mono dim">{{ mod.meta.duration }} min</span>
            }
            @if (mod.meta.prerequisites.length) {
              <span class="label-mono dim">
                Prérequis : {{ mod.meta.prerequisites.join(' · ') }}
              </span>
            }
          </div>
        </header>

        @if (mod.toc.length) {
          <aside class="toc" aria-label="Sommaire">
            <span class="label-mono">Sommaire</span>
            <nav>
              @for (entry of mod.toc; track entry.id) {
                <a [href]="'#' + entry.id" [class.sub]="entry.depth === 3">{{ entry.text }}</a>
              }
            </nav>
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
            }
          }
        </div>
      </article>
    } @else if (mod && mod.meta.stub) {
      <section class="container section reveal">
        <p class="label-mono crumb">{{ frameworkLabel() }} · {{ mod.meta.level }}</p>
        <app-eyebrow>À venir</app-eyebrow>
        <h1 class="display-l">{{ mod.meta.title }}</h1>
        <p class="lead">Ce module est planifié mais pas encore rédigé.</p>
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
    }
    .crumb {
      color: var(--text-dim);
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
    .toc nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }
    .toc a {
      color: var(--text-soft);
      font-size: 14px;
      transition: color var(--dur) var(--ease);
    }
    .toc a:hover {
      color: var(--gold);
    }
    .toc a.sub {
      padding-left: 14px;
      font-size: 13px;
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
      scroll-margin-top: 88px;
    }
    .body .sec::before {
      content: '§ ';
      color: var(--gold);
    }
    .body .h3.sub {
      margin-top: 12px;
      scroll-margin-top: 88px;
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
        top: 88px;
      }
    }
  `,
})
export class ModulePageComponent {
  readonly module = input<CompiledModule | null>(null);
  readonly framework = input<string>('');
  readonly level = input<string>('');
  readonly slug = input<string>('');

  protected readonly frameworkLabel = computed(() =>
    isFramework(this.framework())
      ? FRAMEWORK_LABEL[this.framework() as Framework]
      : this.framework(),
  );

  protected orderLabel(order: number): string {
    return order.toString().padStart(2, '0');
  }
}
