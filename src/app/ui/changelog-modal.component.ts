import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LevelChipComponent } from './level-chip.component';
import { ChangelogService } from '../core/changelog.service';
import { FRAMEWORK_LABEL, type Framework } from '../core/levels';

/** First-visit "what's new" modal listing changelog entries the reader hasn't seen. */
@Component({
  selector: 'app-changelog-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelChipComponent],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="dismiss()">
        <div
          class="panel lg-refract"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
          (click)="$event.stopPropagation()"
        >
          <div class="head">
            <span class="eyebrow label-mono">Quoi de neuf</span>
            <h2 id="changelog-title">Nouveaux articles</h2>
            <button type="button" class="close" aria-label="Fermer" (click)="dismiss()">
              <kbd>esc</kbd>
            </button>
          </div>

          <div class="body" data-lenis-prevent>
            @for (entry of entries(); track entry.id) {
              <section class="entry">
                <header>
                  <h3>{{ entry.title }}</h3>
                  <time [attr.datetime]="entry.date">{{ formatDate(entry.date) }}</time>
                </header>
                @if (entry.note) {
                  <p class="note small">{{ entry.note }}</p>
                }
                <ul class="modules">
                  @for (m of entry.items; track m.framework + m.level + m.slug) {
                    <li>
                      <a
                        class="row"
                        [routerLink]="['/', m.framework, m.level, m.slug]"
                        (click)="dismiss()"
                      >
                        <span class="title">{{ m.title }}</span>
                        <span class="tags">
                          <span class="label-mono fw">{{ fwLabel(m.framework) }}</span>
                          <app-level-chip [level]="m.level" />
                        </span>
                      </a>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>

          <div class="foot">
            <button type="button" class="ok" (click)="dismiss()">Compris</button>
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
      background: color-mix(in oklab, #050409 72%, transparent);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .panel {
      width: min(560px, 92vw);
      max-height: 74vh;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      background: var(--lg-tint-strong);
      backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright));
      -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright));
      box-shadow: var(--lg-edge), var(--lg-elev-hero);
      overflow: hidden;
      transform-origin: top center;
      animation: panel-in var(--dur) var(--ease-spring) both;
    }
    @keyframes panel-in {
      from {
        opacity: 0;
        transform: translateY(-12px) scale(0.97);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .panel {
        animation: none;
      }
    }
    .head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-soft);
    }
    .eyebrow {
      color: var(--accent-2);
    }
    .head h2 {
      flex: 1;
      margin: 0;
      font-size: 18px;
      color: var(--text);
    }
    .close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .body {
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 6px 0;
    }
    .entry {
      padding: 14px 20px;
    }
    .entry header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .entry h3 {
      margin: 0;
      font-size: 15px;
      color: var(--text);
    }
    .entry time {
      font-size: 12px;
      color: var(--text-dim);
      flex-shrink: 0;
    }
    .note {
      margin: 0 0 10px;
      color: var(--text-soft);
    }
    .modules {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--border-soft);
      text-decoration: none;
      transition: border-color var(--dur) var(--ease-out),
        background var(--dur) var(--ease-out);
    }
    .row:hover {
      background: color-mix(in oklab, var(--accent) 14%, transparent);
      border-color: var(--accent);
    }
    .title {
      color: var(--text);
      min-width: 0;
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
    .foot {
      padding: 14px 20px;
      border-top: 1px solid var(--border-soft);
      display: flex;
      justify-content: flex-end;
    }
    .ok {
      font-family: var(--font-body);
      font-size: 14px;
      color: #050409;
      background: var(--accent);
      border: none;
      border-radius: 10px;
      padding: 9px 18px;
      cursor: pointer;
    }
    .ok:hover {
      background: color-mix(in oklab, var(--accent) 88%, #fff);
    }
  `,
})
export class ChangelogModalComponent {
  private readonly changelog = inject(ChangelogService);

  protected readonly open = signal(false);
  protected readonly entries = this.changelog.unseen;

  private readonly dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  protected readonly formatDate = (iso: string) => this.dateFormat.format(new Date(iso));
  protected readonly fwLabel = (fw: Framework) => FRAMEWORK_LABEL[fw];

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (this.changelog.hasUnseen()) this.open.set(true);

      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.open()) this.dismiss();
      };
      window.addEventListener('keydown', onKeydown);
      destroyRef.onDestroy(() => window.removeEventListener('keydown', onKeydown));
    });
  }

  protected dismiss(): void {
    this.open.set(false);
    this.changelog.markSeen();
  }
}
