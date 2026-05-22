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
          <span class="mark" aria-hidden="true"></span>
          <span class="word">Practical<span class="accent"> Docs</span></span>
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
      border-bottom: 1px solid var(--border-soft);
      background: color-mix(in oklab, var(--bg) 80%, transparent);
      backdrop-filter: blur(12px);
    }
    .inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-display);
      font-size: 18px;
    }
    .mark {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: linear-gradient(135deg, var(--gold), var(--gold-soft));
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .link {
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      font-size: 14px;
      transition: color var(--dur) var(--ease);
    }
    .link:hover,
    .link.active {
      color: var(--text);
    }
    .search {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
      padding: 7px 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--text-soft);
      font-size: 14px;
    }
    .search:hover {
      border-color: var(--gold-soft);
      color: var(--text);
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1px 5px;
    }
    @media (max-width: 720px) {
      .link:not(.active) {
        display: none;
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
