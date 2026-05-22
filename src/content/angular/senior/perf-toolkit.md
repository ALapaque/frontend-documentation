---
title: "Perf toolkit"
slug: "perf-toolkit"
framework: "angular"
level: "senior"
order: 4
duration: 20
prerequisites: ["change-detection", "signals", "defer-lazy"]
updated: 2026-05-22
seoTitle: "Perf toolkit — angular"
seoDescription: "Le combo perf complet : OnPush + signals + @for track + @defer + SSR. Quel levier agit sur quoi, comment mesurer avant d'optimiser, et où chacun compte vraiment."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "perf-profiling"
  - framework: "vue"
    slug: "perf-strategy"
---

## Mesurer avant d'optimiser

Aucun de ces leviers ne doit s'appliquer à l'aveugle. Trois axes distincts, trois outils :

- **Coût de rendu / change detection** : Angular DevTools, onglet *Profiler*. Il montre le nombre de cycles de CD et le temps par composant. C'est ici qu'on voit un composant re-vérifié 200 fois pour rien.
- **Coût de chargement** : `source-map-explorer` ou le budget de `angular.json` sur le bundle. C'est ici qu'on voit qu'une lib de 300 ko est dans le chunk initial.
- **Métriques utilisateur** : Lighthouse / Web Vitals (LCP, INP, CLS) en conditions réelles.

Chaque levier ci-dessous attaque un axe précis. Les confondre fait perdre du temps : `OnPush` n'allège pas le bundle, `@defer` n'accélère pas un cycle de CD déjà déclenché.

## OnPush + signals : réduire les cycles

`OnPush` fait passer un composant en détection « sur référence » : il n'est revérifié que si une `@Input`/`input` change de référence, si un événement part de son template, ou s'il est marqué `markForCheck`. Combiné aux signals, la granularité devient encore plus fine : lire un signal dans un template crée une dépendance, et seules les vues qui lisent un signal modifié sont reciblées.

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ total() }}`,
})
export class CartComponent {
  private items = signal<Item[]>([]);
  total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
}
```

:::callout{type="tip"}
En mode zoneless (`provideZonelessChangeDetection()`), les signals deviennent le mécanisme de notification principal : il n'y a plus de zone qui déclenche un CD global sur chaque événement async. C'est l'aboutissement du combo OnPush + signals.
:::

## @for track : éviter de détruire le DOM

Dans une liste, `track` indique à Angular comment identifier une ligne entre deux rendus. Sans identité stable, une réorganisation détruit et recrée tous les nœuds.

:::compare
::bad
```html
@for (row of rows(); track $index) {
  <app-row [data]="row" />
}
```
::
::good
```html
@for (row of rows(); track row.id) {
  <app-row [data]="row" />
}
```
::
:::

**Pourquoi** : `track $index` lie l'identité d'une ligne à sa position. Si on insère un élément en tête, l'index de chaque ligne change : Angular croit que *toutes* les lignes ont changé et réutilise les nœuds DOM avec de mauvaises données, voire recrée tout. Avec `track row.id`, l'identité suit la donnée, pas la position : une insertion ne touche qu'un seul nœud, les composants enfants conservent leur état et leur liaison, et le diff DOM est minimal. Sur de grandes listes, c'est la différence entre recréer 1 nœud et en recréer 1000.

## @defer + SSR : déplacer le coût hors du chemin critique

`@defer` sort un fragment lourd du bundle initial (voir le module dédié). En SSR, le serveur produit le HTML immédiatement visible, puis l'hydratation reprend la main côté client. Deux raffinements senior :

- **Hydratation incrémentale** (`withIncrementalHydration`) : le contenu d'un `@defer` est rendu côté serveur mais hydraté seulement au trigger, économisant du JS au boot.
- **Event replay** (`withEventReplay`) : les clics survenus avant la fin de l'hydratation sont rejoués, supprimant la fenêtre morte du TTI.

```ts
bootstrapApplication(App, {
  providers: [
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
  ],
});
```

## Quel levier pour quel symptôme

| Symptôme mesuré | Levier |
|---|---|
| Trop de cycles de CD, composants revérifiés sans raison | OnPush + signals |
| Liste qui « saute », perte de focus/scroll au tri | `@for ... track id` |
| Bundle initial lourd, LCP élevé | `@defer` + lazy routes |
| Page blanche au premier paint, mauvais FCP | SSR + hydratation |
| INP dégradé après chargement | zoneless + event replay |

## Code source

Les pièces clés vivent dans `@angular/core` :

- La détection de changement et `markViewDirty` / `refreshView` : `packages/core/src/render3/instructions/change_detection.ts`.
- Le graphe de réactivité des signals (producteurs/consommateurs, `consumerMarkDirty`) : `packages/core/primitives/signals/src/graph.ts`.
- L'algorithme de réconciliation de `@for` et le `track` : `packages/core/src/render3/list_reconciliation.ts` (`reconcile`, basé sur un diff par identité Map/LIS).
- Le runtime de `@defer` (états, triggers, hydratation incrémentale) : `packages/core/src/defer/`.

Lire `reconcile` est instructif : il choisit entre un diff trivial (même tête de liste) et un algorithme à base de Map d'identités, ce qui explique pourquoi un `track` correct est la condition de toute son efficacité.
