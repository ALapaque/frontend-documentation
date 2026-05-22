import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FRAMEWORKS, FRAMEWORK_LABEL } from '../core/levels';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="bar">
      <div class="container inner">
        <a routerLink="/" class="brand" aria-label="Accueil Practical Docs">
          <span class="mark" aria-hidden="true">P</span>
          <span class="word">Practical<span class="accent">/</span>Docs</span>
        </a>

        <nav class="nav" aria-label="Navigation principale">
          @for (fw of frameworks; track fw) {
            <a [routerLink]="['/', fw]" routerLinkActive="active" class="link">
              {{ labels[fw] }}
            </a>
          }
          <a routerLink="/compare/state-management" routerLinkActive="active" class="link">
            Comparer
          </a>
          <a routerLink="/search" class="search" aria-label="Rechercher">
            Rechercher
            <kbd>⌘K</kbd>
          </a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    .bar {
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 2px solid var(--border-strong);
      background: color-mix(in oklab, var(--bg) 86%, transparent);
      backdrop-filter: blur(10px) saturate(1.3);
      -webkit-backdrop-filter: blur(10px) saturate(1.3);
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
      font-size: 19px;
      letter-spacing: -0.02em;
    }
    .brand .accent {
      color: var(--accent);
    }
    .mark {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      font-size: 17px;
      border: 1.5px solid var(--border-strong);
      box-shadow: var(--shadow-1);
      transition: transform var(--dur) var(--ease-spring);
    }
    .brand:hover .mark {
      transform: rotate(-6deg) translate(-1px, -1px);
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .link {
      padding: 8px 13px;
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      font-size: 14px;
      font-weight: 500;
      transition: color var(--dur) var(--ease-out), background var(--dur) var(--ease-out);
    }
    .link:hover {
      color: var(--ink);
      background: color-mix(in oklab, var(--ink) 6%, transparent);
    }
    .link.active {
      color: #fff;
      background: var(--ink);
    }
    .search {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
      padding: 7px 8px 7px 14px;
      border: 1.5px solid var(--border-strong);
      border-radius: var(--radius-pill);
      color: var(--ink);
      font-size: 14px;
      font-weight: 500;
      background: var(--bg-card);
      box-shadow: var(--shadow-1);
      transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
    }
    .search:hover {
      transform: translate(-1px, -1px);
      box-shadow: var(--shadow-2);
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
      .link:not(.active) {
        display: none;
      }
      .search {
        padding: 7px 12px;
      }
      .search kbd {
        display: none;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly frameworks = FRAMEWORKS;
  protected readonly labels = FRAMEWORK_LABEL;
}
