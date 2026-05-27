---
title: "View Transitions"
lead: "Animer la navigation entre vues avec l'API native View Transitions."
updated: 2026-05-22
seoTitle: "View Transitions API — Angular vs React vs Vue"
seoDescription: "withViewTransitions (Angular Router), startViewTransition (React/Vue routers) : transitions de page natives du navigateur."
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "react", slug: "concurrent-features" }
  - { framework: "vue", slug: "transitions" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Activation | `withViewTransitions()` | `<ViewTransition>` / Router | Router `viewTransition` |
| API sous-jacente | `document.startViewTransition` | `document.startViewTransition` | `document.startViewTransition` |
| Élément partagé | `view-transition-name` CSS | `view-transition-name` CSS | `view-transition-name` CSS |
| Personnalisation | callback `onViewTransitionCreated` | props sur `<ViewTransition>` | hook `onBeforeLeave` |
| reduced-motion | CSS `@media` à ta charge | CSS `@media` à ta charge | CSS `@media` à ta charge |

## La même API native

Les trois frameworks ne réinventent rien : ils branchent le routeur sur
`document.startViewTransition(cb)`. Le navigateur fige une capture de l'ancien
DOM, exécute ta mise à jour, puis fait un fondu enchaîné vers le nouveau. Tout le travail
fin (éléments partagés, courbes) se fait en **CSS** via les pseudo-éléments
`::view-transition-old()` / `::view-transition-new()` et la propriété
`view-transition-name`.

## Câblage par framework

:::tri{title="Activer les transitions de page"}
::angular
```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({
      onViewTransitionCreated: ({ transition }) => {
        // accès au ViewTransition pour skip/await
      },
    })),
  ],
};
```
::
::react
```tsx
// React Router v7 : ajoute viewTransition sur le lien / la navigation
import { Link } from 'react-router';

function Nav() {
  return <Link to="/photos" viewTransition>Photos</Link>;
}

// React 19+ : composant dédié autour du contenu animé
import { unstable_ViewTransition as ViewTransition } from 'react';

function Page({ children }) {
  return <ViewTransition>{children}</ViewTransition>;
}
```
::
::vue
```ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeResolve(() => {
  if (!document.startViewTransition) return;
  return new Promise((resolve) => {
    document.startViewTransition(() => resolve());
  });
});
```
::
:::

## Le CSS fait le vrai travail

:::callout{type="warn"}
`view-transition-name` doit être **unique** par page. Pour un élément partagé
(une miniature qui s'agrandit), donne le même nom au DOM source et destination —
le navigateur morphe l'un vers l'autre. Et respecte toujours
`@media (prefers-reduced-motion: reduce)` pour couper l'animation.
:::

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

.thumb { view-transition-name: hero; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

## Verdict

C'est l'un des rares domaines où **les trois convergent vers la même API
navigateur** — la différence n'est qu'un point de câblage. Angular est le plus
intégré : `withViewTransitions()` et c'est branché sur tout le routeur. React
Router v7 demande juste `viewTransition` sur le lien ; le `<ViewTransition>` de
React reste *unstable* et plus granulaire. Vue se câble en trois lignes via un
guard. Mais quel que soit le framework, **80 % du résultat est dans le CSS** :
nomme tes éléments partagés, gère `reduced-motion`, et le routeur n'est qu'un
déclencheur.
