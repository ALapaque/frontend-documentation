---
title: "Race conditions async"
lead: "Quand « le dernier qui répond gagne » corrompt ton UI."
updated: 2026-05-22
seoTitle: "Race conditions async — Angular vs React vs Vue"
seoDescription: "Annuler ou ignorer les réponses périmées : switchMap, AbortController, queryKey. Éviter les états incohérents sur requêtes concurrentes."
related:
  - { framework: "angular", slug: "rxjs-operators" }
  - { framework: "react", slug: "server-state" }
  - { framework: "vue", slug: "composables" }
---

## Le bug de la réponse périmée

Vous tapez « pa », « par », « pari » dans un champ de recherche. Trois requêtes
partent. Celle pour « par » répond *après* celle pour « pari » : votre liste
affiche les résultats de « par » alors que le champ contient « pari ».
Personne n'a écrit de bug — c'est juste l'ordre d'arrivée du réseau. La règle
implicite « le dernier qui répond gagne » est exactement l'inverse de ce qu'on
veut : on veut « la dernière *demandée* gagne ».

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Annulation native | `switchMap` annule la précédente | `AbortController` | `AbortController` dans `watch` |
| Stratégie | RxJS opérateur | flag `ignore` ou abort | flag/abort dans le watcher |
| Solution data-layer | — | TanStack Query (queryKey) | TanStack Query Vue |
| Effort | nul (l'opérateur fait tout) | manuel (cleanup) | manuel (cleanup du watch) |

## Annuler ou ignorer

Deux familles de remèdes. **Annuler** la requête en vol : `switchMap` se
désabonne de l'inner observable précédent, `AbortController` interrompt le
`fetch`. **Ignorer** la réponse tardive : un flag `ignore` dans le cleanup de
l'effet, ou une lib de data-fetching (TanStack Query) qui indexe chaque
résultat par sa `queryKey` et jette les réponses qui ne correspondent plus à la
clé active.

:::callout{type="tip"}
En pratique, déléguez à TanStack Query (React et Vue) : la `queryKey` inclut le
terme de recherche, et la lib garantit que seul le résultat de la clé courante
s'affiche. Côté Angular, `switchMap` règle le problème sans dépendance.
:::

## Search-as-you-type sans corruption

:::tri{title="Ignorer les réponses obsolètes"}
::angular
```ts
import { Component, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, startWith } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { switchMap as sw } from 'rxjs/operators';

@Component({ selector: 'app-search', template: `{{ results() | json }}` })
export class Search {
  query = signal('');

  // switchMap annule l'observable précédent : la requête en vol est
  // abandonnée dès qu'une nouvelle frappe arrive. Pas de réponse périmée.
  results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(250),
      switchMap((q) =>
        fromFetch(`/api/search?q=${q}`).pipe(sw((r) => r.json())),
      ),
      startWith([]),
    ),
    { initialValue: [] },
  );
}
```
::
::react
```tsx
import { useEffect, useState } from 'react';

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<unknown[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    let ignore = false;

    fetch(`/api/search?q=${query}`, { signal: ctrl.signal })
      .then((r) => r.json())
      // double garde : on annule le fetch ET on ignore une réponse tardive
      .then((data) => { if (!ignore) setResults(data); })
      .catch(() => {});

    return () => { ignore = true; ctrl.abort(); };
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, watch } from 'vue';

const query = ref('');
const results = ref<unknown[]>([]);

watch(query, (q, _prev, onCleanup) => {
  const ctrl = new AbortController();
  let ignore = false;

  // onCleanup s'exécute avant le prochain run du watcher : on annule
  // la requête en vol et on neutralise sa réponse.
  onCleanup(() => { ignore = true; ctrl.abort(); });

  fetch(`/api/search?q=${q}`, { signal: ctrl.signal })
    .then((r) => r.json())
    .then((data) => { if (!ignore) results.value = data; })
    .catch(() => {});
});
</script>

<template><input v-model="query" /></template>
```
::
:::

## Verdict

Toute requête déclenchée par une entrée qui change est une race condition en
puissance. La discipline : **soit on annule la précédente, soit on ignore les
réponses qui ne correspondent plus à la demande courante**. Angular gagne sans
effort avec `switchMap`. React et Vue exigent un `AbortController` plus un flag
`ignore` dans le cleanup — ou mieux, déléguez à TanStack Query, dont la
`queryKey` rend la garantie automatique. Ne laissez jamais le réseau décider de
l'ordre d'affichage.
