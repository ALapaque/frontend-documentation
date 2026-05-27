---
title: "Routing : les bases"
slug: "routing-basics"
framework: "angular"
level: "junior"
order: 6
duration: 13
prerequisites: ["standalone"]
updated: 2026-05-22
seoTitle: "Routing : les bases — angular"
seoDescription: "provideRouter, lazy loadComponent, paramètres de route et component input binding pour structurer la navigation d'une app standalone."
ogVariant: "sage"
related:
  - framework: "react"
    slug: "routing"
  - framework: "vue"
    slug: "router"
---

## Déclarer des routes

Une route associe un chemin d'URL à un composant. Le tableau de routes est typé `Routes` et fourni au démarrage via `provideRouter`.

```ts
import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserComponent },
  { path: '**', component: NotFoundComponent },
];
```

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
```

Le composant racine affiche la route active avec `<router-outlet>` et navigue avec `routerLink`.

```ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav><a routerLink="/users/1">Profil</a></nav>
    <router-outlet />
  `,
})
export class AppComponent {}
```

## Lazy loading avec loadComponent

`loadComponent` charge le composant à la demande, lors de la première activation de la route, via un import dynamique.

:::compare
::bad
```ts
import { AdminComponent } from './admin.component';

export const routes: Routes = [
  { path: 'admin', component: AdminComponent },
];
```
::
::good
```ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin.component').then((m) => m.AdminComponent),
  },
];
```
::
:::

**Pourquoi** : avec `component: AdminComponent`, l'`import` statique en haut du fichier de routes lie le code d'`AdminComponent` au chunk initial : il est téléchargé et parsé au premier chargement, même si l'utilisateur ne visite jamais `/admin`. Avec `loadComponent`, l'`import()` dynamique crée un point de découpe : le bundler isole `AdminComponent` dans un chunk séparé que le navigateur ne récupère qu'au moment où la route est activée. Le bundle initial est plus léger, donc le temps jusqu'au premier rendu utile diminue.

## Lire les paramètres de route

Deux façons d'obtenir `:id`. La moderne, `withComponentInputBinding`, injecte le paramètre directement comme `input`.

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withComponentInputBinding())],
});
```

```ts
@Component({ selector: 'app-user', template: `Utilisateur {{ id() }}` })
export class UserComponent {
  id = input.required<string>(); // mappé depuis :id
}
```

L'approche classique passe par `ActivatedRoute`, utile pour réagir aux changements de paramètre sans recréer le composant.

```ts
@Component({ selector: 'app-user', template: `...` })
export class UserComponent {
  private route = inject(ActivatedRoute);
  id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))));
}
```

:::callout{type="tip"}
`withComponentInputBinding` couvre 90 % des cas et garde le composant pur (juste un `input`). Garde `ActivatedRoute` pour les flux réactifs ou les `data`/`queryParams` complexes.
:::

:::cheatsheet
- title: "provideRouter(routes)"
  desc: "Enregistre le router au bootstrap."
- title: "loadComponent"
  desc: "Charge un composant en lazy via import dynamique."
- title: "withComponentInputBinding()"
  desc: "Mappe params/query/data sur les inputs du composant."
- title: "<router-outlet />"
  desc: "Emplacement où la route active est rendue."
:::
