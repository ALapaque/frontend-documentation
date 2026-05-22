import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EyebrowComponent } from '../../ui/eyebrow.component';
import { LevelChipComponent } from '../../ui/level-chip.component';
import { SearchService, type SearchResult } from '../../core/search-index/search.service';
import { SeoService } from '../../core/seo/seo.service';
import { FRAMEWORKS, FRAMEWORK_LABEL, type Framework } from '../../core/levels';

interface Group {
  readonly framework: Framework;
  readonly label: string;
  readonly results: SearchResult[];
}

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EyebrowComponent, LevelChipComponent],
  template: `
    <section class="container section reveal">
      <app-eyebrow>Recherche</app-eyebrow>
      <h1 class="display-l">Chercher dans la <span class="accent">doc</span></h1>

      <div class="field">
        <input
          type="text"
          placeholder="signals, suspense, pinia…"
          [value]="query()"
          (input)="onInput($event)"
          autocomplete="off"
          spellcheck="false"
          aria-label="Rechercher dans la documentation"
        />
        <kbd>⌘K</kbd>
      </div>

      @if (query().length >= 2) {
        @if (groups().length) {
          @for (g of groups(); track g.framework) {
            <div class="group">
              <span class="label-mono fw">{{ g.label }}</span>
              <div class="rows">
                @for (r of g.results; track r.id) {
                  <a class="row" [routerLink]="['/', r.framework, r.level, r.slug]">
                    <div class="main">
                      <span class="title">{{ r.title }}</span>
                      <span class="desc small">{{ r.desc }}</span>
                    </div>
                    <app-level-chip [level]="r.level" />
                  </a>
                }
              </div>
            </div>
          }
        } @else {
          <p class="hint">Aucun résultat pour « {{ query() }} ».</p>
        }
      } @else {
        <p class="hint">
          Tape au moins deux caractères. Astuce :
          <kbd class="inlinekbd">⌘K</kbd> ouvre la recherche partout.
        </p>
      }
    </section>
  `,
  styles: `
    .field {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 28px 0 36px;
      padding: 14px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-card);
      max-width: 620px;
    }
    input {
      flex: 1;
      background: none;
      border: none;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 18px;
      outline: none;
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .inlinekbd {
      padding: 1px 5px;
    }
    .group {
      margin-bottom: 28px;
    }
    .fw {
      color: var(--text-dim);
      display: block;
      margin-bottom: 12px;
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      border: 1px solid var(--border-soft);
      border-radius: var(--radius);
      background: var(--bg-card);
      transition: border-color var(--dur) var(--ease);
    }
    .row:hover {
      border-color: var(--gold-soft);
    }
    .main {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .title {
      color: var(--text);
    }
    .desc {
      color: var(--text-dim);
    }
    .hint {
      color: var(--text-soft);
    }
  `,
})
export class SearchComponent {
  private readonly search = inject(SearchService);
  protected readonly query = signal('');
  private readonly debounced = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly groups = computed<Group[]>(() => {
    const results = this.search.search(this.debounced(), 50);
    return FRAMEWORKS.map((fw) => ({
      framework: fw,
      label: FRAMEWORK_LABEL[fw],
      results: results.filter((r) => r.framework === fw),
    })).filter((g) => g.results.length > 0);
  });

  constructor() {
    inject(SeoService).set({
      title: 'Recherche',
      description: 'Recherche full-text dans la documentation Angular, React et Vue.',
      path: '/search',
    });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.debounced.set(value), 150);
  }
}
