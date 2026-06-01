import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FRAMEWORKS, FUNDAMENTALS, FRAMEWORK_LABEL } from '../core/levels';
import { ThemeToggleComponent } from '../ui/theme-toggle.component';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  template: `
    <header class="bar">
      <div class="container inner">
        <a routerLink="/" class="brand" aria-label="Accueil Practical Docs">
          <span class="mark" aria-hidden="true"></span>
          <span class="word">Practical<span class="accent"> Docs</span></span>
        </a>

        <nav class="nav" aria-label="Navigation principale">
          @for (fw of frameworks; track fw) {
            <a [routerLink]="['/', fw]" routerLinkActive="active" class="link">
              {{ labels[fw] }}
            </a>
          }
          <span class="sep" aria-hidden="true"></span>
          @for (fn of fundamentals; track fn) {
            <a [routerLink]="['/', fn]" routerLinkActive="active" class="link">
              {{ labels[fn] }}
            </a>
          }
          <a routerLink="/compare" routerLinkActive="active" class="link">
            Comparer
          </a>
          <a routerLink="/search" class="search" aria-label="Rechercher">
            Rechercher
            <kbd>⌘K</kbd>
          </a>
          <app-theme-toggle />
        </nav>
      </div>
    </header>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 1px solid var(--border-soft);
      background: color-mix(in oklab, var(--bg) 55%, transparent);
      backdrop-filter: blur(22px) saturate(1.4);
      -webkit-backdrop-filter: blur(22px) saturate(1.4);
    }
    .inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-h);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 11px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .mark {
      width: 18px;
      height: 18px;
      border-radius: 6px;
      background: var(--grad);
      box-shadow: 0 0 18px -2px color-mix(in oklab, var(--accent) 70%, transparent);
      transition: transform var(--dur) var(--ease-spring);
    }
    .brand:hover .mark {
      transform: rotate(-8deg) scale(1.08);
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .sep {
      width: 1px;
      height: 18px;
      margin: 0 6px;
      background: var(--border-strong);
    }
    .link {
      position: relative;
      padding: 8px 13px;
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      font-size: 14px;
      font-weight: 500;
      transition: color var(--dur) var(--ease);
    }
    .link::after {
      content: "";
      position: absolute;
      left: 13px;
      right: 13px;
      bottom: 3px;
      height: 2px;
      border-radius: 2px;
      background: var(--grad);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform var(--dur) var(--ease-out);
    }
    .link:hover {
      color: var(--text);
    }
    .link.active {
      color: var(--text);
    }
    .link.active::after {
      transform: scaleX(1);
    }
    .search {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 10px;
      padding: 8px 9px 8px 14px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      color: var(--text-soft);
      font-size: 14px;
      background: var(--glass);
      transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }
    .search:hover {
      color: var(--text);
      border-color: color-mix(in oklab, var(--accent) 50%, transparent);
      box-shadow: var(--glow);
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-soft);
      background: var(--bg-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 2px 6px;
    }
    @media (max-width: 720px) {
      .link:not(.active),
      .sep {
        display: none;
      }
      .search {
        padding: 8px 13px;
      }
      .search kbd {
        display: none;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly frameworks = FRAMEWORKS;
  protected readonly fundamentals = FUNDAMENTALS;
  protected readonly labels = FRAMEWORK_LABEL;
}
