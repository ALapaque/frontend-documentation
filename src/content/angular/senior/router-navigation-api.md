---
title: "Le router sur la Navigation API"
slug: "router-navigation-api"
framework: "angular"
level: "senior"
order: 12
duration: 14
prerequisites: ["interceptors-guards"]
updated: 2026-07-08
seoTitle: "Router Angular 22 — Navigation API native, interception des ancres, rendu par route"
seoDescription: "Angular 22 aligne le router sur la Navigation API du navigateur : interception native des liens (RouterLink et ancres standards), stratégies de rendu par route, et les changements de défauts (paramsInheritanceStrategy, canMatch) à connaître pour migrer."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "routing-basics" }
  - { framework: "angular", slug: "ssr-hydration" }
---

Depuis ses débuts, le router Angular simule la navigation : il capture les clics
sur les liens décorés de `routerLink`, pousse des entrées avec `pushState` et
écoute `popstate` pour rattraper les boutons précédent/suivant. La Navigation
API du navigateur, pensée dès l'origine pour les SPA, rend cette mécanique
maison superflue : un seul événement `navigate` centralise toutes les
navigations, interceptables avant qu'elles ne partent.

Angular converge vers cette primitive : l'intégration est arrivée en 21.1
derrière `withExperimentalPlatformNavigation()` et reste opt-in — et
expérimentale — dans Angular 22, sorti le 3 juin 2026. La v22 apporte par
ailleurs des changements router bien réels : nouveaux défauts, `browserUrl`,
options de `withComponentInputBinding()`. Tour d'horizon.

## Pourquoi la Navigation API change la donne

Avec la History API, aucun point d'interception n'existe : `pushState` mute
l'URL en silence, `popstate` se déclenche après coup, et rien ne permet de
bloquer ou de rediriger une navigation en vol. Le router devait donc tout
refaire à la main : capturer les clics (uniquement sur les ancres portant
`routerLink`), reconstruire l'URL cible, gérer lui-même scroll et focus. La
Navigation API inverse le modèle :

```js
navigation.addEventListener('navigate', (event) => {
  if (!event.canIntercept) return; // cross-origin, téléchargement…
  event.intercept({
    async handler() {
      await renderRoute(new URL(event.destination.url));
    },
  });
});
```

**Pourquoi.** Un seul écouteur voit passer *toutes* les navigations : clics sur
n'importe quelle ancre, navigations programmatiques, et même les traversals
(précédent/suivant), avec l'URL de destination exposée via `event.destination`.
Le navigateur sait qu'une navigation SPA est en cours : il anime son indicateur
de chargement, propose un bouton stop, restaure scroll et focus nativement.
Tout ce que le router bricolait, la plateforme le fournit.

## Ce qui change concrètement en v22

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withExperimentalPlatformNavigation())],
};
```

Avec cette feature, le router délègue son intégration navigateur à la
Navigation API. Conséquence la plus visible : il peut intercepter des
navigations déclenchées **hors du router** et les convertir en navigations
SPA — y compris les ancres standards `<a href="…">` sans `routerLink`. Fini le
rechargement complet quand un contenu CMS ou un HTML injecté via
`innerHTML` contient des liens bruts vers des routes internes.

:::callout{type="warn"}
Le préfixe `Experimental` n'est pas décoratif : la prise en charge navigateur
de la Navigation API est encore partielle, et l'équipe Angular prévient que la
feature ne se stabilisera pas avant qu'elle s'élargisse — la forme même du
provider peut changer. À tester sur un environnement dédié, pas en production.
:::

## Rendu par route

Côté serveur, chaque route choisit sa stratégie de rendu via la configuration
`ServerRoute` — la brique du SSR hybride, qui prend tout son sens combinée à
l'hydratation incrémentale :

```ts
// app.routes.server.ts
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },          // statique, généré au build
  { path: 'dashboard/**', renderMode: RenderMode.Client }, // CSR pur, zone privée
  { path: '**', renderMode: RenderMode.Server },           // SSR à la requête
];
```

**Pourquoi.** Un même artefact de build sert du statique là où c'est possible,
du SSR là où le SEO l'exige, du CSR là où le contenu est privé. Sur les routes
rendues côté serveur, `@defer (hydrate on viewport)` hydrate ensuite le DOM
morceau par morceau. Selon les premiers retours sur la v22,
`provideClientHydration()` activerait désormais l'hydratation incrémentale
automatiquement (débrayable via `withNoIncrementalHydration()`) — vérifie le
comportement réel sur ton app avant de retirer tes triggers explicites.

## Les changements de défauts à connaître

**`paramsInheritanceStrategy: 'always'` par défaut.** Chaque route hérite des
`params` et `data` de tous ses parents, plus seulement dans les cas
`emptyOnly`. Aucune migration automatique : pour garder l'ancien comportement,
il faut le fixer explicitement.

```ts
provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' }));
```

**`canMatch` prend un 3e paramètre obligatoire**, `currentSnapshot`, l'état
courant du router au moment du matching. Un codemod fait la mise à jour.

:::compare
::bad
```ts
export const canMatchAdmin: CanMatchFn = (route, segments) =>
  inject(AuthStore).isAdmin(); // v21 : signature à deux paramètres
```
::
::good
```ts
export const canMatchAdmin: CanMatchFn = (route, segments, currentSnapshot) =>
  inject(AuthStore).isAdmin(); // v22 : currentSnapshot obligatoire
```
::
:::

**`withComponentInputBinding()` devient configurable** : `queryParams`
(booléen, `true` par défaut) décide si les query params sont liés aux inputs,
et `unmatchedInputBehavior` (`'alwaysUndefined'` par défaut, ou
`'undefinedIfStale'`) pilote la valeur poussée dans les inputs sans
correspondance.

**`RouterLink` gagne un input `browserUrl`** : la route activée et l'URL
affichée peuvent diverger.

```html
<a [routerLink]="['/users', user.id]" browserUrl="/mon-profil">Mon profil</a>
```

**Pourquoi.** Le cumul `'always'` + input binding est le vrai piège : un
paramètre `:id` parent et un input `id` enfant qui s'ignoraient hier se
retrouvent liés aujourd'hui. C'est le point d'audit numéro un de la migration.

## Migration

```bash
ng update @angular/core@22 @angular/cli@22
```

Le codemod ajoute `currentSnapshot` à tes fonctions `canMatch` (pense aussi à
tes mocks de guards dans les tests). En revanche, rien n'est automatisé pour
`paramsInheritanceStrategy` : audite les collisions de noms de paramètres
parent/enfant et les inputs liés par le router, puis choisis — adopter
`'always'` ou épingler `'emptyOnly'`. Garde
`withExperimentalPlatformNavigation()` pour un spike, pas pour la prod.

## À retenir

:::cheatsheet
- title: "Navigation API"
  desc: "withExperimentalPlatformNavigation() : opt-in, expérimental, intercepte aussi les ancres sans routerLink."
- title: "Rendu par route"
  desc: "ServerRoute + RenderMode.Server / Client / Prerender dans app.routes.server.ts."
- title: "Nouveau défaut params"
  desc: "paramsInheritanceStrategy: 'always' — retour à 'emptyOnly' via withRouterConfig, sans codemod."
- title: "canMatch"
  desc: "3e paramètre currentSnapshot obligatoire — codemod fourni par ng update."
- title: "Input binding"
  desc: "withComponentInputBinding({ queryParams, unmatchedInputBehavior }) désormais configurable."
- title: "browserUrl"
  desc: "RouterLink peut afficher dans la barre d'adresse une URL différente de la route activée."
:::
