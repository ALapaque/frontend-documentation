import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';
import { SearchPaletteComponent } from './ui/search-palette.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SearchPaletteComponent],
  template: `
    <a class="skip-link" href="#main">Aller au contenu</a>
    <app-header />
    <main id="main">
      <router-outlet />
    </main>
    <app-footer />
    <app-search-palette />
  `,
})
export class App {}
