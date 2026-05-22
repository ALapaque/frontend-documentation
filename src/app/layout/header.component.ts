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
      background: color-mix(in oklab, var(--bg) 72%, transparent);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
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
      font-size: 19px;
      letter-spacing: -0.01em;
    }
    .mark {
      width: 16px;
      height: 16px;
      border-radius: 5px;
      background: var(--sheen-gold);
      box-shadow: 0 0 0 1px color-mix(in oklab, var(--gold) 30%, transparent),
        0 2px 10px -2px color-mix(in oklab, var(--gold) 50%, transparent);
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
    .link {
      position: relative;
      padding: 8px 13px;
      border-radius: var(--radius-sm);
      color: var(--text-soft);
      font-size: 14px;
      transition: color var(--dur) var(--ease-out);
    }
    .link::after {
      content: "";
      position: absolute;
      left: 13px;
      right: 13px;
      bottom: 2px;
      height: 1.5px;
      background: var(--gold);
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
      padding: 7px 8px 7px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      color: var(--text-soft);
      font-size: 14px;
      transition: border-color var(--dur) var(--ease-out),
        color var(--dur) var(--ease-out), background var(--dur) var(--ease-out);
    }
    .search:hover {
      border-color: var(--gold-soft);
      color: var(--text);
      background: color-mix(in oklab, var(--gold) 6%, transparent);
    }
    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
      background: var(--bg-inset);
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
