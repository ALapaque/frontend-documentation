---
title: "Routing"
lead: "Déclarer des routes, charger en lazy, protéger et passer des paramètres."
updated: 2026-05-22
seoTitle: "Routing — Angular vs React vs Vue"
seoDescription: "Angular Router vs TanStack/React Router v7 vs Vue Router : déclaration, lazy loading, guards et params typés."
related:
  - { framework: "angular", slug: "routing-basics" }
  - { framework: "react", slug: "routing" }
  - { framework: "vue", slug: "router" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Déclaration | Tableau `Routes` | Tableau / fichiers | Tableau `routes` |
| Lazy | `loadComponent` | `lazy()` / route module | `() => import()` |
| Params typés | Faible (string) | Fort (TanStack Router) | Faible (string) |
| Guards | `CanActivateFn` | `loader` + `redirect` | `beforeEnter` |
| Data loading | `Resolver` / signal | `loader` (TanStack/RR7) | `beforeRouteEnter` |

## Déclaration et lazy loading

Les trois chargent un composant à la demande via `import()` dynamique. La
divergence est philosophique sur **où vivent les données**. Angular et Vue
gardent historiquement le routeur comme un simple aiguilleur ; React Router v7 et
surtout **TanStack Router** font du routeur la couche de chargement de données
(loaders, cache, invalidation) et, pour TanStack, la **type-safety de bout en
bout** sur les params et search params.

## Une route lazy avec param

:::tri{title="Route /users/:id chargée à la demande"}
::angular
```ts
export const routes: Routes = [
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./user.page').then((m) => m.UserPage),
    canActivate: [authGuard],
  },
];

// dans le composant
id = inject(ActivatedRoute).snapshot.params['id']; // string
```
::
::react
```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$id')({
  loader: ({ params }) => fetchUser(params.id), // params.id typé
  beforeLoad: ({ context }) => {
    if (!context.auth.user) throw redirect({ to: '/login' });
  },
  component: UserPage,
});

function UserPage() {
  const { id } = Route.useParams(); // typé string
}
```
::
::vue
```ts
const routes = [
  {
    path: '/users/:id',
    component: () => import('./UserPage.vue'),
    beforeEnter: (to) => (isAuth() ? true : '/login'),
  },
];

// dans le composant
const route = useRoute();
const id = route.params.id; // string
```
::
:::

## Guards, loaders et données

:::callout{type="info"}
Deux modèles s'opposent. **Guard** (Angular `CanActivateFn`, Vue `beforeEnter`) :
une fonction décide d'autoriser ou rediriger avant l'entrée. **Loader**
(TanStack / React Router v7) : la route déclare *ses données*, le routeur les
charge en parallèle de la transition et gère le cache. Le loader supprime le
classique "spinner par composant".
:::

## Verdict

Pour un routing **classique** (déclarer, lazy-loader, garder), les trois sont
équivalents et matures. Le clivage tient en deux mots : **type-safety** et **data
loading**. Si ces deux points sont critiques, **TanStack Router** est aujourd'hui
le plus avancé des trois écosystèmes — params, search params et loaders
entièrement typés. Angular et Vue restent excellents pour un routeur classique
mais traitent les params comme des `string` et délèguent souvent le chargement à
une couche data dédiée. Choix simple : routeur-aiguilleur (Angular/Vue) vs
routeur-data-layer typé (TanStack).
