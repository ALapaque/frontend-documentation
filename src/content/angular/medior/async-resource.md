---
title: "resource() & httpResource()"
slug: "async-resource"
framework: "angular"
level: "medior"
order: 9
duration: 15
prerequisites: ["signals"]
updated: 2026-05-22
seoTitle: "Angular resource() & httpResource() — data async par signaux"
seoDescription: "Charger des données async avec resource(), httpResource() et rxResource : status, value, error et re-fetch réactif."
ogVariant: "gold"
related:
  - { framework: "react", slug: "server-state" }
  - { framework: "vue", slug: "composables" }
---

## Le problème : l'état async à la main

Charger de la donnée async avec des signaux nus, c'est vite une soupe de
`signal` + `effect` : un signal pour la valeur, un pour le `loading`, un pour
l'erreur, un `effect` qui déclenche le fetch et qui doit gérer l'annulation des
requêtes obsolètes. Beaucoup de plomberie, beaucoup de bugs de course.

```ts
// le pattern qu'on ne veut plus écrire
const data = signal<User | undefined>(undefined);
const loading = signal(false);
const error = signal<unknown>(null);

effect(() => {
  const id = userId();
  loading.set(true);
  fetch(`/api/users/${id}`)
    .then((r) => r.json())
    .then((u) => data.set(u))   // pas d'annulation : course si id change
    .catch((e) => error.set(e))
    .finally(() => loading.set(false));
});
```

`resource()` encapsule exactement cet état.

## resource({ params, loader })

`resource()` prend une fonction `params` (réactive) et un `loader` async. Il
expose un état unifié sous forme de signaux : `value()`, `status()`, `error()`,
`isLoading()`. Quand un signal lu dans `params` change, le loader **re-fetch**
automatiquement et annule la requête précédente via un `AbortSignal`.

```ts
import { resource, signal } from '@angular/core';

const userId = signal(1);

const userRes = resource({
  params: () => ({ id: userId() }),
  loader: async ({ params, abortSignal }) => {
    const r = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
    return r.json() as Promise<User>;
  },
});

userRes.value();      // User | undefined
userRes.isLoading();  // boolean
userRes.error();      // unknown
```

:::cheatsheet
- title: "value()"
  desc: "La donnée chargée, ou undefined tant qu'elle n'est pas résolue."
- title: "status()"
  desc: "Idle | Loading | Resolved | Error | Reloading — l'état machine complet."
- title: "isLoading()"
  desc: "Raccourci booléen pour les états de chargement."
- title: "reload()"
  desc: "Force un re-fetch sans changer les params."
:::

## L'état idle et le re-fetch réactif

Si `params` renvoie `undefined`, la resource passe en **idle** : le loader ne se
déclenche pas. C'est le moyen idiomatique de dire « pas encore les bonnes
conditions pour charger » — par exemple un id pas encore sélectionné.

```ts
const selected = signal<number | undefined>(undefined);

const res = resource({
  params: () => {
    const id = selected();
    return id === undefined ? undefined : { id }; // undefined → idle, pas de fetch
  },
  loader: ({ params }) => api.get(params.id),
});
```

## httpResource() : le cas HTTP

Pour le cas le plus courant — un GET via `HttpClient` — `httpResource()` évite le
boilerplate du loader. Tu lui passes une fonction qui retourne l'URL (réactive),
il gère la requête et le parsing.

```ts
import { httpResource } from '@angular/common/http';

const userId = signal(1);
const user = httpResource<User>(() => `/api/users/${userId()}`);

// user.value(), user.isLoading(), user.error() — même API
```

:::compare
::bad
```ts
data = signal<User>(); loading = signal(false); error = signal(null);
effect(() => {
  loading.set(true);
  this.http.get<User>(`/api/users/${this.id()}`)
    .subscribe({ next: (u) => this.data.set(u), error: (e) => this.error.set(e) });
  // pas d'annulation, pas de status fin, fuite de souscription possible
});
```
::
::good
```ts
user = httpResource<User>(() => `/api/users/${this.id()}`);
// status(), value(), error(), annulation automatique au changement d'id
```
::
:::

**Pourquoi** : le pattern manuel mélange trois signaux d'état désynchronisables et
n'annule pas la requête obsolète quand `id` change vite — la dernière réponse
arrivée gagne, pas forcément la bonne. `httpResource()` modélise l'état comme une
seule machine (`status()`) cohérente par construction et câble l'`AbortSignal` à
la requête HTTP : changer la source annule l'ancienne et garde uniquement la
réponse pertinente.

### Idée reçue : « resource() remplace RxJS »

Non. `resource()` cible le pattern *read-resource* : charger une donnée en
fonction de paramètres, avec re-fetch et annulation. Ce n'est pas un bus
d'événements, pas du streaming, pas de la composition d'événements complexe
(`debounce`, `mergeMap`, websockets). Pour ça, RxJS reste l'outil. D'ailleurs
`rxResource` fait le pont : un loader qui renvoie un `Observable` plutôt qu'une
`Promise`, pour réutiliser tes opérateurs.

:::callout{type="tip"}
`rxResource({ params, stream })` accepte un loader qui retourne un Observable.
Pratique quand ta source est déjà un flux RxJS (WebSocket, polling) mais que tu
veux l'exposer comme une resource adossée à des signaux.
:::
