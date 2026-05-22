import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  readonly label: string;
  readonly link?: string;
}

@Component({
  selector: 'app-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="crumbs label-mono" aria-label="Fil d'Ariane">
      @for (c of items(); track c.label; let last = $last) {
        @if (c.link && !last) {
          <a [routerLink]="c.link">{{ c.label }}</a>
        } @else {
          <span [class.current]="last" [attr.aria-current]="last ? 'page' : null">{{ c.label }}</span>
        }
        @if (!last) {
          <span class="sep" aria-hidden="true">·</span>
        }
      }
    </nav>
  `,
  styles: `
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      color: var(--text-dim);
    }
    a {
      color: var(--text-dim);
      transition: color var(--dur) var(--ease-out);
    }
    a:hover {
      color: var(--accent);
    }
    .sep {
      color: var(--border-strong);
    }
    .current {
      color: var(--ink);
      font-weight: 700;
    }
  `,
})
export class BreadcrumbComponent {
  readonly items = input.required<readonly Crumb[]>();
}
