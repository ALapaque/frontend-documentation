---
title: "Data fetching"
lead: "Où charger, quand charger, et qui possède le cache."
updated: 2026-05-23
seoTitle: "Data fetching — Angular vs React vs Vue"
seoDescription: "httpResource et resource Angular, RSC et use() avec TanStack Query React, useFetch et useAsyncData Nuxt : waterfall vs parallèle, prefetch, cache et dédup."
related:
  - { framework: "angular", slug: "async-resource" }
  - { framework: "react", slug: "server-state" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue (Nuxt) |
| --- | --- | --- | --- |
| Primitive lecture | `httpResource()` / `resource()` | `use(promise)` + RSC, ou TanStack Query | `useFetch` / `useAsyncData` |
| Réactif aux params | oui (signal source) | oui (queryKey) | oui (clé + `watch`) |
| Cache partagé | non natif (à construire) | TanStack Query (`queryKey`) | payload Nuxt + clé |
| Dédup en vol | non natif | oui (par clé) | oui (par clé) |
| Invalidation | relancer la source / `reload()` | `invalidateQueries` | `refresh()` / `refreshNuxtData` |
| Intercepteurs | `HttpInterceptorFn` | manuel (wrapper `fetch`) | `$fetch` interceptors |
| Lieu d'exécution | client (SSR via TransferState) | serveur (RSC) ou client | serveur + hydratation |

## La vraie question : où s'exécute le chargement

Avant de comparer les API, il faut situer **où** la donnée part. React 19 déplace
le centre de gravité côté serveur avec les **Server Components** : un `async`
component `await`-e directement sa donnée, zéro JS envoyé au client pour cette
requête. Nuxt fait du SSR par défaut : `useFetch` s'exécute sur le serveur au
premier rendu, sérialise le résultat dans le payload, et **ne refait pas** la
requête à l'hydratation. Angular reste centré client : `httpResource` tourne dans
le navigateur, et le SSR repose sur `TransferState` pour éviter la double requête.

Conséquence pratique : en React/Nuxt, « fetch sur le serveur » est le chemin par
défaut ; en Angular, c'est un opt-in qu'il faut câbler.

## Une ressource réactive aux paramètres

L'erreur classique est de charger une seule fois dans un `ngOnInit` / `useEffect` /
`onMounted`, puis d'oublier de recharger quand l'`id` change. Les trois offrent
une primitive qui **re-déclenche** la requête quand sa source change.

:::tri{title="Charger un user, re-fetch quand l'id change"}
::angular
```ts
import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-user',
  template: `
    @if (user.isLoading()) { <p>Chargement…</p> }
    @else if (user.error()) { <p>Erreur</p> }
    @else { <h1>{{ user.value()?.name }}</h1> }
  `,
})
export class User {
  id = input.required<string>();
  // L'URL est une fonction : elle relit le signal id, donc la
  // ressource se relance automatiquement à chaque changement d'id.
  // Réponse précédente abandonnée : pas de race condition.
  user = httpResource<{ name: string }>(() => `/api/users/${this.id()}`);
}
```
::
::react
```tsx
import { useQuery } from '@tanstack/react-query';

function User({ id }: { id: string }) {
  // queryKey inclut id : changer d'id = nouvelle entrée de cache,
  // dédup automatique si deux composants demandent le même id,
  // et la réponse périmée est jetée par la lib.
  const { data, isPending, error } = useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) =>
      fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
  });

  if (isPending) return <p>Chargement…</p>;
  if (error) return <p>Erreur</p>;
  return <h1>{data.name}</h1>;
}
```
::
::vue
```vue
<script setup lang="ts">
const props = defineProps<{ id: string }>();

// La clé dépend de id et watch suit props.id : refetch auto.
// Sur SSR, la requête tourne côté serveur et le résultat est
// transféré dans le payload — pas de refetch à l'hydratation.
const { data, pending, error } = await useFetch(
  () => `/api/users/${props.id}`,
  { key: () => `user-${props.id}`, watch: [() => props.id] },
);
</script>

<template>
  <p v-if="pending">Chargement…</p>
  <p v-else-if="error">Erreur</p>
  <h1 v-else>{{ data?.name }}</h1>
</template>
```
::
:::

## Waterfall vs parallèle

Le piège de performance numéro un est le **waterfall** : on attend la fin d'une
requête pour lancer la suivante, alors qu'elles sont indépendantes. Charger le
profil *puis* ses posts en série double la latence pour rien.

:::compare
::bad
```tsx
// Deux awaits en série dans un Server Component.
async function Page({ id }: { id: string }) {
  const user = await getUser(id);     // 120 ms
  const posts = await getPosts(id);   // 120 ms après → 240 ms total
  return <Profile user={user} posts={posts} />;
}
```
::
::good
```tsx
// Lancées ensemble, on n'attend qu'une fois le max des deux.
async function Page({ id }: { id: string }) {
  const [user, posts] = await Promise.all([
    getUser(id),
    getPosts(id),
  ]); // ~120 ms total
  return <Profile user={user} posts={posts} />;
}
```
::
:::

**Pourquoi.** Deux requêtes indépendantes n'ont aucune raison de s'attendre. Le
`await` séquentiel crée un waterfall artificiel : la latence devient la *somme*
des appels au lieu du *max*. `Promise.all` (React/Angular) ou plusieurs
`useAsyncData` non-`await`-és en parallèle (Vue) les exécutent de front. Un
waterfall n'est légitime que lorsqu'une requête a réellement besoin du résultat
de la précédente (ex. récupérer un `orgId` avant les membres).

## Prefetch, cache et invalidation

Le cache n'est pas une optimisation accessoire : c'est ce qui transforme une
navigation en affichage instantané. Trois leviers se combinent.

- **Prefetch** : charger avant le besoin. TanStack Query expose
  `queryClient.prefetchQuery` (au survol d'un lien, par exemple) ; Nuxt prefetch
  les payloads des routes liées via `<NuxtLink>` ; Angular n'a pas d'équivalent
  natif et passe par un `Resolver` ou un préchargement manuel.
- **Dédup** : deux composants qui demandent la même donnée en même temps ne font
  qu'une requête. Automatique avec TanStack Query (par `queryKey`) et Nuxt (par
  `key`). À construire soi-même côté Angular `httpResource`.
- **Invalidation** : après une mutation, marquer la donnée comme périmée pour
  forcer un refetch. `queryClient.invalidateQueries(['user', id])`,
  `refreshNuxtData('user-1')`, ou rappeler la source / `resource.reload()`.

:::callout{type="warn"}
Ne confonds pas **`staleTime`** (durée pendant laquelle la donnée est considérée
fraîche, donc *aucun* refetch) et **`gcTime`** (durée de rétention en cache d'une
donnée inactive avant garbage collection). Mettre `staleTime: 0` partout fait
refetcher à chaque montage et annule l'intérêt du cache.
:::

## Mutations et cohérence

Lire est facile ; le piège est de garder l'écran cohérent **après** une écriture.
TanStack Query (`useMutation` + `invalidateQueries` ou mises à jour optimistes)
et Nuxt (`$fetch` POST + `refresh()`) ont un chemin balisé. Angular gère la
mutation via `HttpClient` puis relance la `resource` concernée. Dans tous les cas,
préfère **invalider la source de vérité** plutôt que muter le cache à la main,
sauf pour l'optimistic UI où l'on assume le rollback en cas d'échec.

:::cheatsheet
- title: "httpResource(() => url)"
  desc: "Angular : ressource HTTP réactive, se relance quand un signal lu dans l'URL change."
- title: "useQuery({ queryKey, queryFn })"
  desc: "React : lecture cachée et dédupliquée par clé, avec signal d'annulation fourni."
- title: "useFetch(url, { key, watch })"
  desc: "Nuxt : fetch SSR sérialisé dans le payload, refetch sur changement de watch."
- title: "Promise.all([...])"
  desc: "Lance des requêtes indépendantes en parallèle au lieu d'un waterfall."
- title: "invalidateQueries / refreshNuxtData"
  desc: "Marque une donnée périmée après mutation pour forcer le refetch."
- title: "staleTime vs gcTime"
  desc: "Fraîcheur (pas de refetch) vs rétention en cache d'une donnée inactive."
:::

## Verdict

React (RSC + TanStack Query pour le client) et Nuxt (`useFetch`/`useAsyncData`)
arrivent avec un **modèle de cache intégré** : dédup, invalidation et SSR sans
double requête sortent de la boîte. Angular fournit des primitives propres et
réactives (`httpResource`, `resource`, intercepteurs typés) mais te laisse
construire la couche cache partagé toi-même — ce qui pousse beaucoup d'équipes
Angular vers TanStack Query Angular. Le réflexe transverse, quel que soit le
framework : **charger en parallèle, indexer par une clé qui inclut tous les
paramètres, et invalider après écriture.**
