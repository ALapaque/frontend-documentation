---
title: "Signals ↔ RxJS"
slug: "signals-rxjs-interop"
framework: "angular"
level: "senior"
order: 1
duration: 19
prerequisites: ["signals"]
updated: 2026-05-22
seoTitle: "Signals ↔ RxJS interop — toSignal, toObservable, rxResource"
seoDescription: "Faire cohabiter signals et RxJS : toSignal, toObservable, rxResource, et les patterns de migration."
ogVariant: "crimson"
related:
  - { framework: "vue", slug: "composables" }
  - { framework: "react", slug: "server-state" }
---

## Deux modèles, un pont

Les signals sont **synchrones et pull**. RxJS est **asynchrone et push**. Tu ne
choisis pas l'un contre l'autre : tu utilises le bon outil par couche. La règle
empirique : RxJS pour orchestrer des événements asynchrones, signals pour
exposer un état à la vue.

## `toSignal` : consommer un Observable

```ts
import { toSignal } from '@angular/core/rxjs-interop';

private route = inject(ActivatedRoute);
readonly userId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
  initialValue: null,
});
```

`toSignal` s'abonne pour toi et se désabonne à la destruction. Plus de
`takeUntilDestroyed` manuel, plus d'`| async` qui souscrit plusieurs fois.

## `toObservable` : repartir vers RxJS

Quand tu as besoin d'opérateurs (`debounceTime`, `switchMap`), repasse en flux.

```ts
readonly query = signal('');
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap((q) => this.api.search(q)),
  ),
  { initialValue: [] },
);
```

## `rxResource` : l'état async, complet

Pour un fetch dépendant d'un signal, `rxResource` expose `value`, `status` et
`error` d'un coup.

```ts
readonly user = rxResource({
  params: () => ({ id: this.userId() }),
  stream: ({ params }) => this.api.getUser(params.id),
});
// user.value() | user.status() | user.error() | user.isLoading()
```

:::callout{type="warn"}
L'API a évolué : `request` est devenu `params`, et le `loader` de `rxResource`
s'appelle désormais `stream` (Angular 20+). Si `params` retourne `undefined`, la
ressource reste *idle* — pratique pour ne déclencher le fetch qu'une fois l'`id`
disponible.
:::

:::cheatsheet
- title: "toSignal(obs$)"
  desc: "Observable → signal. Désabonnement auto, valeur initiale conseillée."
- title: "toObservable(sig)"
  desc: "Signal → Observable, pour brancher des opérateurs RxJS."
- title: "rxResource({ params, stream })"
  desc: "État async réactif : value / status / error, re-fetch sur changement de params."
:::

:::callout{type="warn"}
N'enchaîne pas `toObservable` → `toSignal` → `toObservable` en boucle pour de
l'état purement synchrone. Si aucune opération asynchrone n'est en jeu, reste en
`computed`. Le pont a un coût (micro-tâche, glitch potentiel).
:::

## Code source

`toSignal` s'appuie sur `effect` + `DestroyRef` ; `rxResource` est bâti sur la
primitive `resource()`. Lire `packages/core/rxjs-interop` éclaire la sémantique
exacte de la valeur initiale et du timing de désabonnement.
