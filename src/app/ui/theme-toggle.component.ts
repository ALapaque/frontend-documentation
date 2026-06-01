import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService, type ThemeMode } from '../core/theme.service';

/** Three-segment colour-mode toggle: light · auto · dark. */
@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="radiogroup" aria-label="Mode de couleur">
      @for (opt of opts; track opt.id) {
        <button
          type="button"
          role="radio"
          class="opt"
          [class.active]="mode() === opt.id"
          [attr.aria-checked]="mode() === opt.id"
          [attr.aria-label]="opt.label"
          [title]="opt.label"
          (click)="set(opt.id)"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            @switch (opt.id) {
              @case ('light') {
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              }
              @case ('auto') {
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
              }
              @case ('dark') {
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              }
            }
          </svg>
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: var(--bg-card);
      backdrop-filter: blur(20px) saturate(1.2);
      -webkit-backdrop-filter: blur(20px) saturate(1.2);
      box-shadow: var(--hi-edge);
    }
    .opt {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      color: var(--text-dim);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: color var(--dur) var(--ease-out), background var(--dur) var(--ease-out);
    }
    .opt:hover {
      color: var(--text-soft);
    }
    .opt.active {
      color: var(--bg);
      background: var(--accent);
      box-shadow: 0 0 0 1px var(--accent), 0 6px 14px -4px color-mix(in oklab, var(--accent) 60%, transparent);
    }
    .opt svg {
      display: block;
    }
  `,
  imports: [],
  standalone: true,
  host: {},
})
export class ThemeToggleComponent {
  private readonly theme = inject(ThemeService);
  protected readonly mode = this.theme.mode;

  protected readonly opts: ReadonlyArray<{ id: ThemeMode; label: string }> = [
    { id: 'light', label: 'Mode clair' },
    { id: 'auto', label: 'Suivre le système' },
    { id: 'dark', label: 'Mode sombre' },
  ];

  protected set(mode: ThemeMode): void {
    this.theme.set(mode);
  }
}
