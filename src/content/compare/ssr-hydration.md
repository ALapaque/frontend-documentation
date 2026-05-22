---
title: "SSR & Hydration"
lead: "Rendre côté serveur, puis reprendre la main côté client — sans tout rejouer."
updated: 2026-05-22
seoTitle: "SSR & Hydration — Angular vs React vs Vue"
seoDescription: "Approches SSR comparées : hydration non destructive, streaming/RSC et rendu hybride Nuxt."
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "react", slug: "streaming-ssr" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

## Les approches

| Critère | Angular | React | Vue (Nuxt) |
| --- | --- | --- | --- |
| Hydration | Non destructive + incrémentale | Selective (RSC) | Progressive |
| Streaming | Via `@defer` / incremental | Natif (Suspense) | Natif |
| Event replay | `withEventReplay()` | — | — |
| Rendu hybride | Routes server/prerender | Par segment | ISR / hybrid |

## Activer l'hydration

:::tri{title="Bootstrap avec hydration"}
::angular
```ts
provideClientHydration(
  withEventReplay(),
  withIncrementalHydration(),
);
```
::
::react
```tsx
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root')!, <App />);
```
::
::vue
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true,
  routeRules: { '/blog/**': { isr: true } },
});
```
::
:::

## Verdict

React pousse le modèle le plus ambitieux avec les Server Components et
l'hydration sélective, au prix d'un modèle mental plus exigeant. Angular vise
la **continuité** : hydration non destructive, event replay, hydration
incrémentale via `@defer`. Nuxt offre le meilleur **rendu hybride** clé en main
(SSR, ISR, edge). Le bon choix dépend de ton besoin de granularité contre ton
budget de complexité.
