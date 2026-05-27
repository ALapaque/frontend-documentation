---
title: "Architecture du state"
slug: "state-architecture"
framework: "react"
level: "senior"
order: 5
duration: 21
prerequisites: ["context-perf", "server-state"]
updated: 2026-05-22
seoTitle: "Architecture du state — react"
seoDescription: "Zustand, Jotai, Redux Toolkit et les signals (Preact) : modèles de stockage (store/atomique/réducteur/réactif) et critères pour préférer chacun."
ogVariant: "crimson"
related:
  - framework: "vue"
    slug: "state-architecture"
  - framework: "angular"
    slug: "signals"
---

Avant de choisir une lib de state, pose-toi la vraie question : quel *modèle* d'état ? Distingue d'abord le **server state** (donnée distante, asynchrone, cachée — du ressort de TanStack Query, voir `server-state`) du **client state** (UI, sélection, formulaire éphémère). Les libs ci-dessous couvrent le client state ; chacune incarne un modèle différent avec un coût de re-rendu différent.

## Quatre modèles

- **Zustand** — un store unique externe, lu par sélecteur. Tu t'abonnes à une *tranche*, pas au store entier. API minimale, hors de l'arbre React donc immunisé aux re-rendus de Context.
- **Jotai** — atomes : des unités d'état composables, lues individuellement. Modèle « bottom-up » dérivé de Recoil ; un composant re-rend si et seulement si un atome qu'il lit change.
- **Redux Toolkit (RTK)** — un store unique, mutations via réducteurs (slices), flux d'actions tracé. Prévisibilité, devtools, middleware, RTK Query intégré.
- **Signals (Preact)** — valeur réactive à granularité fine : lire un signal abonne le composant, et seul ce qui dépend du signal se met à jour, parfois sans re-rendu du composant entier.

```tsx
// Zustand : store + sélecteur
const useStore = create<State>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));
function Compteur() {
  const count = useStore((s) => s.count); // abonné à count uniquement
  const inc = useStore((s) => s.inc);
  return <button onClick={inc}>{count}</button>;
}
```

```tsx
// Jotai : atomes composables
const countAtom = atom(0);
const doubleAtom = atom((get) => get(countAtom) * 2);
function Compteur() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom); // re-rend si double change
  return <button onClick={() => setCount(c => c + 1)}>{count}/{double}</button>;
}
```

## Le vrai critère : la granularité d'abonnement

:::compare
::bad
```tsx
// Context comme store global d'état mutant souvent
const StoreCtx = createContext(null);
function Conso() {
  const { count } = useContext(StoreCtx); // re-rend dès QUE la value change
  return <span>{count}</span>;            // même si seul "user" a bougé
}
```
::
::good
```tsx
// Zustand : abonnement sélectif à la tranche utilisée
function Conso() {
  const count = useStore((s) => s.count); // re-rend SEULEMENT si count change
  return <span>{count}</span>;
}
```
::
:::

**Pourquoi** : Context propage par identité de la `value` entière, sans sélecteur (voir `context-perf`) : tout consommateur re-rend dès que la value change, même pour une tranche qui ne le concerne pas. Zustand maintient le store hors de l'arbre React et utilise `useSyncExternalStore` : le sélecteur extrait une tranche, et React ne re-rend l'abonné que si cette tranche change (comparée par égalité). Jotai obtient le même résultat par atome, les signals par dépendance lue. Le mécanisme déterminant n'est pas l'ergonomie de l'API mais la **granularité d'abonnement** : Context = grain gros (toute la value), store/atome/signal = grain fin (la tranche réellement lue). À haut volume de mises à jour avec beaucoup d'abonnés disjoints, c'est ce grain qui décide du nombre de re-rendus.

## Quand préférer chacun

- **Zustand** : client state pragmatique, équipe qui veut peu de cérémonie. Sélecteurs explicites, pas de Provider obligatoire, store testable isolément. Le défaut raisonnable des projets neufs.
- **Jotai** : état très fragmenté et dérivé, dépendances fines entre morceaux d'UI (éditeurs, canvas, formulaires complexes). Le modèle atomique évite de penser à un store monolithique.
- **RTK** : grosse app, flux d'événements à auditer, besoin de devtools/time-travel, équipe nombreuse appréciant la rigueur du flux d'actions. RTK Query si tu veux aussi gérer le server state dans le même outil.
- **Signals** : surtout natif en Preact ; en React, modèle encore périphérique. Pertinent pour de la réactivité ultra-fine, mais s'écarte du modèle de rendu standard de React.

:::callout{type="warn"}
Le piège récurrent : router le server state dans une de ces libs. Donnée distante = cache, déduplication, revalidation, invalidation. C'est TanStack Query (ou RTK Query). Mettre des réponses d'API dans Zustand/Redux « à la main » recrée un cache buggé. Garde le server state et le client state séparés.
:::

## Code source

Toutes ces libs s'appuient sur `useSyncExternalStore` (hook React 18 dans `packages/react/src/ReactHooks.js`, doc `react.dev/reference/react/useSyncExternalStore`), conçu précisément pour brancher un store externe au modèle concurrent sans tearing. Zustand : `pmndrs/zustand` (`src/react.ts`). Jotai : `pmndrs/jotai` (modèle d'atomes dans `src/vanilla/`). Redux Toolkit : `reduxjs/redux-toolkit`. Signals Preact : `preactjs/signals` (`packages/react` pour l'adaptateur React). Lire ces adaptateurs montre comment chacun convertit un abonnement externe en re-rendu React.

## À retenir

:::cheatsheet
- title: "Server ≠ client state"
  desc: "Donnée distante = TanStack/RTK Query ; ces libs ne couvrent que le client state."
- title: "Granularité d'abonnement"
  desc: "Store/atome/signal s'abonnent à une tranche ; Context propage la value entière."
- title: "Zustand par défaut"
  desc: "Minimal, sélecteurs, hors arbre. Jotai si état atomique/dérivé, RTK si audit/devtools."
- title: "useSyncExternalStore"
  desc: "Le socle commun : branche un store externe sans tearing en mode concurrent."
:::
