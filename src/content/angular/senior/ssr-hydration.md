---
title: "SSR & Hydration"
slug: "ssr-hydration"
framework: "angular"
level: "senior"
order: 3
duration: 21
prerequisites: ["zoneless"]
updated: 2026-05-22
seoTitle: "Angular SSR & Hydration — event replay, incremental"
seoDescription: "Hydration non destructive, event replay et incremental hydration : reprendre le HTML serveur sans le rejouer."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "streaming-ssr" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

## Le problème de l'hydration

Le serveur rend du HTML. Le client doit « reprendre » ce DOM : attacher les
listeners, reconstruire l'état des composants — **sans tout re-rendre**.
L'ancien SSR Angular détruisait puis recréait le DOM (flash, perte de scroll).
L'hydration moderne est **non destructive** : elle réutilise les nœuds existants.

```ts
provideClientHydration(
  withEventReplay(),
  withIncrementalHydration(),
);
```

## Event replay : ne pas perdre les clics

Entre l'affichage du HTML et la fin de l'hydration, l'utilisateur peut cliquer.
`withEventReplay()` capture ces événements et les **rejoue** une fois le
composant hydraté. Plus de clic « dans le vide ».

## Incremental hydration : hydrater à la demande

Couplée à `@defer`, l'hydration incrémentale ne réveille un îlot que lorsqu'on
en a besoin — réduisant le JS exécuté au chargement.

```html
@defer (hydrate on viewport) {
  <app-comments [postId]="id" />
}
```

:::cheatsheet
- title: "withEventReplay()"
  desc: "Rejoue les événements survenus avant la fin de l'hydration."
- title: "withIncrementalHydration()"
  desc: "Hydrate les blocs @defer à la demande (viewport, interaction…)."
- title: "@defer (hydrate on …)"
  desc: "Déclare l'îlot et son déclencheur d'hydration."
:::

:::callout{type="warn"}
L'hydration exige un DOM **identique** entre serveur et client. Tout accès
direct à `window`/`document` au rendu, ou tout HTML conditionné par un état
seulement client, provoque un mismatch (`NG0500`). Passe par `afterNextRender`
ou `isPlatformBrowser`.
:::

## Code source

`packages/platform-browser/src/hydration.ts` détaille l'algorithme de matching
des nœuds et le format des annotations sérialisées (`ngh`). C'est la clé pour
comprendre les messages de mismatch.
