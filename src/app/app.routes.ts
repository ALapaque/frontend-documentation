import { Routes } from '@angular/router';
import { compareResolver, moduleResolver } from './content/content.resolver';

/**
 * Every page type is code-split via `loadComponent`. Per-module markdown is
 * lazy-loaded by the content layer (Phase 2), so the framework/level lazy
 * granularity lives in the content chunks rather than in route bundles.
 * Static segments are declared before the dynamic `:framework` catch so they
 * are not swallowed by it.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    title: 'Practical Docs — Three frameworks. One discipline.',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
    title: 'Recherche — Practical Docs',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about.component').then((m) => m.AboutComponent),
    title: 'À propos — Practical Docs',
  },
  {
    path: 'compare/:topic',
    loadComponent: () =>
      import('./features/compare-page/compare-page.component').then(
        (m) => m.ComparePageComponent,
      ),
    resolve: { doc: compareResolver },
  },
  {
    path: ':framework',
    loadComponent: () =>
      import('./features/framework-hub/framework-hub.component').then(
        (m) => m.FrameworkHubComponent,
      ),
  },
  {
    path: ':framework/:level/:slug',
    loadComponent: () =>
      import('./features/module-page/module-page.component').then(
        (m) => m.ModulePageComponent,
      ),
    resolve: { module: moduleResolver },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page introuvable — Practical Docs',
  },
];
