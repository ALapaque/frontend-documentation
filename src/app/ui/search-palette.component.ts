import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import { SearchService, type SearchResult } from '../core/search-index/search.service';
import { FRAMEWORK_LABEL } from '../core/levels';

/** Global Cmd/Ctrl+K command palette with debounced full-text search. */
@Component({
  selector: 'app-search-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelChipComponent],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close()">
        <div
          class="palette"
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          (click)="$event.stopPropagation()"
        >
          <div class="field">
            <input
              #input
              type="text"
              placeholder="Rechercher un module…"
              [value]="query()"
              (input)="onInput($event)"
              (keydown)="onKey($event)"
              autocomplete="off"
              spellcheck="false"
              aria-label="Rechercher"
            />
            <kbd>esc</kbd>
          </div>

          <div class="results">
            @for (r of results(); track r.id; let i = $index) {
              <a
                class="row"
                [class.active]="i === activeIndex()"
                (click)="go(r)"
                (mouseenter)="activeIndex.set(i)"
              >
                <div class="main">
                  <span class="title">{{ r.title }}</span>
                  <span class="desc small">{{ r.desc }}</span>
                </div>
                <div class="tags">
                  <span class="label-mono fw">{{ fwLabel(r.framework) }}</span>
                  <app-level-chip [level]="r.level" />
                </div>
              </a>
            } @empty {
              <p class="hint small">
                @if (query().length >= 2) {
                  Aucun résultat pour « {{ query() }} ».
                } @else {
                  Tape au moins deux caractères. Frameworks, niveaux, concepts.
                }
              </p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1500;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 12vh;
      background: color-mix(in oklab, #000 65%, transparent);
      backdrop-filter: blur(4px);
    }
    .palette {
      width: min(620px, 92vw);
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--bg-elev);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-soft);
    }
    input {
      flex: 1;
      background: none;
      border: none;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 17px;
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
    .results {
      overflow-y: auto;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      cursor: pointer;
      border-left: 2px solid transparent;
    }
    .row.active {
      background: var(--bg-card);
      border-left-color: var(--gold);
    }
    .main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .title {
      color: var(--text);
    }
    .desc {
      color: var(--text-dim);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 360px;
    }
    .tags {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .fw {
      color: var(--text-dim);
    }
    .hint {
      padding: 24px 18px;
      color: var(--text-dim);
    }
  `,
})
export class SearchPaletteComponent {
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  private readonly debounced = signal('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly results = computed<SearchResult[]>(() => this.search.search(this.debounced()));

  protected readonly fwLabel = (fw: SearchResult['framework']) => FRAMEWORK_LABEL[fw];

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onKeydown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggle();
        } else if (e.key === 'Escape' && this.open()) {
          this.close();
        }
      };
      window.addEventListener('keydown', onKeydown);
      destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeydown));
    });

    effect(() => {
      if (this.open()) {
        const el = this.inputRef()?.nativeElement;
        if (el) queueMicrotask(() => el.focus());
      }
    });
  }

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
    this.query.set('');
    this.debounced.set('');
    this.activeIndex.set(0);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.activeIndex.set(0);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.debounced.set(value), 150);
  }

  protected onKey(event: KeyboardEvent): void {
    const max = this.results().length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, max));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const r = this.results()[this.activeIndex()];
      if (r) this.go(r);
    }
  }

  protected go(r: SearchResult): void {
    this.close();
    void this.router.navigate(['/', r.framework, r.level, r.slug]);
  }
}
