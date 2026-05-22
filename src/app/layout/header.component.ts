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
      background: color-mix(in oklab, var(--bg) 62%, transparent);
      backdrop-filter: blur(20px) saturate(1.4);
      -webkit-backdrop-filter: blur(20px) saturate(1.4);
    }
    /* champagne hairline under the bar */
    .bar::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 1px;
      background: var(--gold-line);
      opacity: 0.5;
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
      gap: 12px;
      font-family: var(--font-display);
      font-size: 19px;
      letter-spacing: -0.01em;
    }
    .mark {
      width: 17px;
      height: 17px;
      border-radius: 5px;
      background: var(--gold-metallic);
      box-shadow: 0 0 0 1px var(--hairline-gold),
        0 4px 16px -4px color-mix(in oklab, var(--gold) 55%, transparent);
      transition: transform var(--dur) var(--ease-spring);
    }
    .brand:hover .mark {
      transform: rotate(-8deg) scale(1.06);
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .link {
      position: relative;
      padding: 8px 14px;
      color: var(--text-soft);
      font-size: 14px;
      transition: color var(--dur) var(--ease-out);
    }
    .link::after {
      content: "";
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 4px;
      height: 1px;
      background: var(--gold);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform var(--dur) var(--ease-out);
    }
    .link:hover {
      color: var(--text);
    }
    .link.active {
      color: var(--gold-bright);
    }
    .link.active::after {
      transform: scaleX(1);
    }
    .search {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-left: 10px;
      padding: 8px 9px 8px 15px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      color: var(--text-soft);
      font-size: 14px;
      background: color-mix(in oklab, #fff 3%, transparent);
      transition: color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out),
        box-shadow var(--dur) var(--ease-out);
    }
    .search:hover {
      color: var(--text);
      border-color: var(--hairline-gold);
      box-shadow: var(--glow-gold);
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
  protected readonly labels = FRAMEWORK_LABEL;
}
