---
title: "Taille du bundle"
lead: "Ce que l'utilisateur télécharge avant de voir quoi que ce soit."
updated: 2026-05-23
seoTitle: "Taille du bundle — Angular vs React vs Vue"
seoDescription: "Tree-shaking, code-splitting au niveau route et defer/lazy, analyse de bundle, coût du runtime Angular vs React vs Vue Vapor, imports lourds, piège du barrel file."
related:
  - { framework: "angular", slug: "defer-lazy" }
  - { framework: "react", slug: "concurrent-features" }
  - { framework: "vue", slug: "perf-strategy" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue (Nuxt) |
| --- | --- | --- | --- |
| Runtime de base | ~moyen (DI, Zone-less, signals) | petit (`react` + `react-dom`) | petit ; **Vapor** supprime le VDOM |
| Tree-shaking | standalone + esbuild | bundler (Vite/Turbopack) | Vite + macros compilées |
| Split par route | `loadComponent` (lazy routes) | `lazy()` + `Suspense` / RSC | dynamic import + `defineAsyncComponent` |
| Split sous-route | `@defer` (viewport, idle, interaction) | `lazy()` ad hoc | `defineAsyncComponent` |
| Analyse | `source-map-explorer` / `esbuild --metafile` | `rollup-plugin-visualizer` | `nuxi analyze` / visualizer |
| Piège classique | barrel `index.ts` | barrel + `import *` | barrel + auto-imports mal réglés |

## Le coût n'est pas que le framework

Le runtime du framework est rarement le principal coupable d'un bundle obèse. En
mi-2026, `react` + `react-dom` et le cœur de Vue sont petits ; Angular est plus
lourd à cause de la DI et de l'infrastructure, mais le **mode zoneless** et les
signaux ont allégé la note. La nouveauté côté Vue est **Vapor Mode** : un mode de
compilation qui **supprime le virtual DOM**, génère du code impératif direct et
réduit fortement le runtime expédié pour les composants concernés.

Mais sur un vrai projet, le poids vient surtout de **tes dépendances** : une lib
de dates complète, un éditeur riche, une lib d'icônes importée en entier, un SDK
analytics. Le levier numéro un n'est pas le choix de framework, c'est **ne pas
charger ce qui ne sert pas tout de suite**.

```bash
# Voir QUI pèse, par framework.
ng build --configuration production            # puis source-map-explorer dist/**/*.js
npx vite-bundle-visualizer                      # projet Vite (React/Vue)
npx nuxi analyze                                # Nuxt
```

## Trois leviers, dans cet ordre

1. **Tree-shaking** : n'embarquer que le code réellement importé. Suppose des
   modules ES et des libs `sideEffects: false`. Un `import *` ou un barrel mal
   conçu le casse.
2. **Code-splitting par route** : chaque route est un chunk séparé, chargé à la
   navigation. C'est le gain le plus universel et le moins risqué.
3. **Splitting sous-route** (`@defer`, `lazy`, async components) : différer un
   bloc lourd *dans* une page (carte, graphe, éditeur) jusqu'à ce qu'il soit
   visible ou utilisé.

## Lazy-loader une route

:::tri{title="Charger un composant de route à la demande"}
::angular
```ts
// loadComponent → chunk séparé, téléchargé à la navigation.
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then((m) => m.Reports),
  },
];
```
::
::react
```tsx
// lazy() crée un chunk ; Suspense affiche un fallback pendant le téléchargement.
import { lazy, Suspense } from 'react';
const Reports = lazy(() => import('./Reports'));

function Route() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Reports />
    </Suspense>
  );
}
```
::
::vue
```ts
// Le dynamic import dans la définition de route = chunk par route.
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/reports', component: () => import('./Reports.vue') },
  ],
});
```
::
:::

## Le piège du barrel file

:::compare
::bad
```ts
// utils/index.ts ré-exporte 40 modules.
export * from './date';
export * from './charts'; // tire d3, 90 kB
export * from './pdf';     // tire pdf-lib, 200 kB

// Ailleurs : on ne veut QUE formatDate, mais…
import { formatDate } from '@/utils';
```
::
::good
```ts
// Import direct du module : seul date.ts entre dans le chunk.
import { formatDate } from '@/utils/date';
```
::
:::

**Pourquoi.** Un barrel (`index.ts` qui `export *`) crée un graphe de dépendances
où tout pointe vers tout. Même si tu n'importes qu'`formatDate`, le bundler doit
analyser l'ensemble du barrel, et le moindre **side effect** (ou une lib sans
`sideEffects: false`) empêche d'élaguer le reste : `charts` et `pdf` partent dans
le chunk. Résultat courant : un import « innocent » traîne des centaines de kB.
Importer directement le sous-module court-circuite le barrel et laisse le
tree-shaking faire son travail. Bonus : les barrels ralentissent aussi le
démarrage du dev-server et brouillent le code-splitting.

:::callout{type="warn"}
Un `import` statique d'une lib lourde la place dans le chunk *initial*, même si
elle n'est utilisée que dans un cas rare. Pour les dépendances volumineuses
(éditeur, carte, graphe), utilise un **import dynamique** (`@defer`, `lazy`,
`defineAsyncComponent`) afin de la sortir du chemin critique de chargement.
:::

## Différer dans la page, pas seulement entre pages

Le split par route ne suffit pas si une seule page embarque un graphe de 150 kB
visible uniquement après scroll. Sortir ce bloc du bundle initial est exactement
le rôle du splitting sous-route.

```ts
// Angular — @defer charge le bloc (et son JS) à l'entrée dans le viewport.
@defer (on viewport) {
  <app-revenue-chart [data]="data()" />
} @placeholder {
  <div class="skeleton"></div>
}
```

L'équivalent React est `lazy()` autour du composant lourd avec un `Suspense`
local ; côté Vue, `defineAsyncComponent` avec un `Suspense` ou un placeholder.
Dans les trois cas, le principe est identique : **un import dynamique = une
frontière de chunk**.

:::cheatsheet
- title: "loadComponent (Angular)"
  desc: "Route lazy : un chunk par route, téléchargé à la navigation."
- title: "lazy() + Suspense (React)"
  desc: "Frontière de chunk avec fallback pendant le téléchargement du composant."
- title: "component: () => import() (Vue Router)"
  desc: "Dynamic import au niveau route pour un découpage automatique."
- title: "@defer (on viewport/idle/interaction)"
  desc: "Angular : différer un bloc intra-page hors du chunk initial."
- title: "Évite export * (barrel)"
  desc: "Importe le sous-module direct pour préserver le tree-shaking."
- title: "Vapor Mode (Vue)"
  desc: "Compilation sans virtual DOM : moins de runtime expédié."
- title: "nuxi analyze / visualizer"
  desc: "Cartographie le bundle pour repérer les dépendances lourdes."
:::

## Verdict

Le choix de framework joue à la marge : tous ont un bon tree-shaking et un bundler
moderne (Vite/esbuild/Turbopack), et les runtimes sont proches une fois Angular en
zoneless, React minimal, et Vue éventuellement en **Vapor**. Le vrai levier est
**comportemental** : split par route systématique, `@defer`/`lazy`/async pour les
blocs lourds, imports directs au lieu de barrels, et **mesure régulière** du
bundle pour attraper la dépendance qui a doublé de poids. Un mauvais barrel ou un
`import *` annule plus d'octets que n'importe quel changement de framework.
