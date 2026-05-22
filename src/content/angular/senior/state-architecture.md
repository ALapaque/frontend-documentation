---
title: "Architecture du state"
slug: "state-architecture"
framework: "angular"
level: "senior"
order: 8
duration: 20
prerequisites: ["signals", "dependency-injection"]
updated: 2026-05-22
seoTitle: "Angular — architecture du state (SignalStore, NgRx)"
seoDescription: "Choisir sa gestion d'état : services + signals, NgRx SignalStore, NgRx Store classique — et quand chacun se justifie."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "state-architecture" }
  - { framework: "vue", slug: "state-architecture" }
---

## Le spectre, pas le dogme

Il n'y a pas une bonne réponse, il y a un **gradient** de solutions, calibré sur
la complexité du state, pas sur la taille de l'appli. Surdimensionner coûte du
boilerplate ; sous-dimensionner coûte de la traçabilité.

:::cheatsheet
- title: "Service + signals"
  desc: "État local ou de feature simple. Zéro dépendance, lecture directe."
- title: "NgRx SignalStore"
  desc: "Store de feature structuré : state + computed + methods, scopé en DI."
- title: "NgRx Store (Redux)"
  desc: "Grosse appli : effects, actions tracées, devtools, time-travel."
:::

La règle pratique : commence au plus simple, remonte le gradient *quand une
douleur réelle apparaît* (besoin de traçabilité, effects orchestrés, état partagé
entre features distantes), pas par anticipation.

## Niveau 1 — service + signals

Pour l'état d'une feature qui ne sort pas de son périmètre, un service injectable
qui expose des signaux suffit. Source de vérité privée, lectures dérivées
publiques, mutations via méthodes.

```ts
@Injectable()
export class CartService {
  private readonly _items = signal<Item[]>([]);

  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));

  add(item: Item) {
    this._items.update((items) => [...items, item]);
  }
}
```

## Niveau 2 — NgRx SignalStore

Quand la feature grossit (plusieurs slices, dérivés, méthodes, effets de
chargement), `signalStore()` structure tout ça avec des *features* composables :
`withState`, `withComputed`, `withMethods`.

```ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<{ items: Item[]; loading: boolean }>({ items: [], loading: false }),
  withComputed(({ items }) => ({
    total: computed(() => items().reduce((s, i) => s + i.price, 0)),
    count: computed(() => items().length),
  })),
  withMethods((store) => ({
    add(item: Item) {
      patchState(store, { items: [...store.items(), item] });
    },
  })),
);
```

Le store reste 100 % signaux : pas d'Observable imposé, lecture directe dans les
templates et les `computed`.

## God-service vs store scopé

:::compare
::bad
```ts
@Injectable({ providedIn: 'root' })
export class AppState {
  user = signal<User | null>(null);
  cart = signal<Item[]>([]);
  orders = signal<Order[]>([]);
  notifications = signal<Notif[]>([]);
  // + 30 méthodes, mutations partout, durée de vie = toute l'appli
}
```
::
::good
```ts
// un store par domaine, scopé à la feature qui le fournit
export const CartStore = signalStore(
  withState<{ items: Item[] }>({ items: [] }),
  withComputed(/* dérivés du panier */),
  withMethods(/* mutations du panier */),
);
// fourni au niveau de la route panier → détruit en sortant
```
::
:::

**Pourquoi** : le god-service mutualise des états sans rapport dans un singleton à
durée de vie globale. Conséquences : couplage (tout dépend de tout), pas de
frontière de responsabilité, état qui survit alors que la feature est partie, et
tests qui doivent instancier le monde entier. Un store scopé par domaine borne la
surface mutable, calque son cycle de vie sur celui de la feature (fourni au niveau
de la route, détruit avec elle) et reste testable en isolation. La traçabilité
vient du périmètre, pas du volume de code.

## Niveau 3 — NgRx Store classique

Pour les grosses applis où plusieurs features orchestrent des effets de bord
asynchrones partagés, où l'on veut un log d'actions, du time-travel et des
devtools, le Store Redux-like garde sa place. Le coût (actions, reducers,
effects, sélecteurs) s'amortit quand la **traçabilité** d'un flux complexe devient
un besoin de production, pas avant.

Arbitrage de fond : *boilerplate* contre *traçabilité*. Plus tu montes le
gradient, plus tu paies en cérémonie, plus tu gagnes en observabilité du flux
d'état. Choisis le niveau le plus bas qui couvre ta douleur réelle.

## Code source

`@ngrx/signals` est bâti **sur les primitives signal d'Angular**, pas sur une
machinerie parallèle. Lire `modules/signals/src` éclaire le mécanisme : `signalStore`
compose des *store features* (`signalStoreFeature`), `withState` génère des
signaux racine, `withComputed` les dérive, et `patchState` applique des updaters
immuables via `signal.update`. Le store final n'est qu'un objet exposant ces
signaux — d'où l'interop transparente avec `computed`/`effect`. Comparer avec
`modules/store/src` (Store Redux) montre l'autre modèle : un `reducer` pur + un
flux d'`Actions`, où la réactivité passe par des sélecteurs mémoïsés plutôt que
par des signaux.
