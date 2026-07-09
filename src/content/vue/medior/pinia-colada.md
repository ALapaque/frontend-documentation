---
title: "Pinia Colada : le data-fetching pour Vue"
slug: "pinia-colada"
framework: "vue"
level: "medior"
order: 13
duration: 15
prerequisites: ["pinia"]
updated: 2026-07-09
seoTitle: "Pinia Colada — cache asynchrone, useQuery et useMutation pour Vue"
seoDescription: "Pinia Colada, la couche de data-fetching bâtie sur Pinia : useQuery et le cache partagé, invalidation, mutations optimistes, staleTime/gcTime. L'équivalent Vue de TanStack Query, intégré à l'écosystème Pinia."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "pinia" }
  - { framework: "vue", slug: "composables" }
---

## Le fetch « à la main » ne passe pas l'échelle

Le premier composant qui charge des données ressemble toujours à ça : trois
`ref` (`data`, `error`, `loading`), un `try/catch/finally`, un appel au montage.
Ça marche. Puis le même trio se recopie dans le composant suivant. Puis deux
composants affichent la même liste et déclenchent **deux requêtes** identiques.
Personne ne met en cache, alors chaque navigation refetch tout. Et quand une
donnée change, il faut se souvenir à la main de tous les endroits à rafraîchir.

L'état de chargement dupliqué, l'absence de cache, les requêtes en double, la
revalidation manuelle : ce ne sont pas des bugs, c'est la limite du fetch
impératif. Pinia Colada attaque exactement ce terrain.

## Positionnement : un cache asynchrone déclaratif

Pinia Colada est la couche de data-fetching bâtie sur Pinia, par Eduardo San
Martin Morote (mainteneur de Pinia et de Vue Router). Plutôt que d'écrire
*comment* charger, tu déclares *quelle* donnée tu veux sous une **clé**, et la
bibliothèque prend en charge le cache, la déduplication des requêtes, la
revalidation *stale-while-revalidate* et l'invalidation.

L'idée est la même que TanStack Query côté React, mais l'intégration est
idiomatique Vue : le cache **est** un store Pinia, les retours sont réactifs, et
tout se consomme depuis un `<script setup>` comme un composable ordinaire.

:::callout{type="warn"}
Pinia Colada est encore jeune et en maturation en tant que compagnon de Pinia.
L'esprit de l'API est stable, mais des détails de signature peuvent bouger :
épingle une version précise et garde la doc officielle à portée de main.
:::

## Installation et plugin

Le paquet est `@pinia/colada`. Il s'enregistre comme un plugin d'application,
**après** Pinia, car il branche son cache dessus.

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { PiniaColada } from '@pinia/colada';

const app = createApp(App);

app.use(createPinia());
app.use(PiniaColada, {
  queryOptions: {
    staleTime: 5000, // défaut par requête (voir plus bas)
  },
});
```

**Pourquoi après Pinia** : le cache de Colada vit dans un store Pinia. Sans
instance Pinia active, il n'aurait nulle part où stocker ses entrées.

## `useQuery` : déclarer une lecture

Une query, c'est une **clé** (un tableau sérialisable qui identifie la donnée)
et une fonction `query` async qui renvoie une `Promise`. Colada déclenche
l'appel, met le résultat en cache sous la clé, et déduplique les appels
concurrents.

```ts
import { useQuery } from '@pinia/colada';

const { state, asyncStatus, data, error, refresh } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((r) => r.json()),
});
```

Le retour est réactif. Deux statuts distincts cohabitent, et c'est volontaire :

- `state.status` décrit la **donnée** : `'pending'` (rien encore), `'success'`
  (on a une donnée) ou `'error'`.
- `asyncStatus` décrit la **requête** : `'idle'` ou `'loading'` (un appel est en
  vol, maintenant).

**Pourquoi deux statuts** : c'est ce qui rend le *stale-while-revalidate*
lisible. Tu peux avoir `state.status === 'success'` (une donnée en cache à
afficher) *et* `asyncStatus === 'loading'` (une revalidation en arrière-plan) au
même instant. Un seul booléen `loading` ne saurait pas exprimer ça.

```vue
<script setup>
import { useQuery } from '@pinia/colada';

const { state, asyncStatus } = useQuery({
  key: ['todos'],
  query: getTodos,
});
</script>

<template>
  <p v-if="state.status === 'pending'">Chargement…</p>
  <p v-else-if="state.status === 'error'">{{ state.error.message }}</p>
  <ul v-else :class="{ stale: asyncStatus === 'loading' }">
    <li v-for="t in state.data" :key="t.id">{{ t.title }}</li>
  </ul>
</template>
```

Le point clé : **une clé = une entrée de cache partagée**. Deux composants qui
appellent `useQuery({ key: ['todos'], … })` lisent la même entrée. Résultat : une
seule requête réseau, une seule source de vérité, aucune synchronisation à
écrire. Pour une clé dynamique, passe une **fonction** — la query se réexécute
quand la clé change.

```ts
const { data } = useQuery({
  key: () => ['todo', route.params.id],
  query: () => getTodo(route.params.id),
});
```

:::callout{type="tip"}
Pour ne pas éparpiller les clés, `defineQueryOptions()` factorise et type la
définition d'une query dans un fichier dédié, réutilisable partout. `defineQuery()`
va plus loin : il combine une query avec de l'état supplémentaire, à la manière
d'un tout petit store.
:::

## `staleTime` et `gcTime` : fraîcheur contre garbage collection

Deux durées à ne pas confondre, car elles répondent à deux questions
différentes.

- **`staleTime`** — combien de temps la donnée reste *fraîche*. Tant qu'elle est
  fraîche, remonter un composant ou appeler la même query **ne relance rien** :
  le cache suffit. Passé ce délai, la donnée devient *stale* et sera revalidée en
  arrière-plan à la prochaine occasion (montage, focus…).
- **`gcTime`** — combien de temps une entrée **sans observateur** survit en
  cache. Quand plus aucun composant n'utilise une clé, Colada garde l'entrée un
  moment ; passé `gcTime`, elle est supprimée (garbage collected).

**Pourquoi les séparer** : `staleTime` arbitre le trafic réseau (éviter de
refetch une donnée encore bonne), `gcTime` arbitre la mémoire (jeter ce que plus
personne ne regarde). Un `staleTime` haut sur des données stables coupe les
requêtes inutiles ; un `gcTime` généreux évite de recharger de zéro quand
l'utilisateur revient sur un écran.

## `useMutation` : écrire, puis invalider

`useQuery` lit, `useMutation` écrit (POST, PUT, PATCH, DELETE). Il expose
`mutate` (déclenche la mutation) et `mutateAsync` (renvoie une `Promise`), plus
des hooks de cycle de vie : `onMutate`, `onSuccess`, `onError`, `onSettled`.

Une écriture rend le cache lié périmé. On l'**invalide** via `useQueryCache()`,
qui donne accès au cache et à `invalidateQueries({ key })`.

```ts
import { useMutation, useQueryCache } from '@pinia/colada';

const queryCache = useQueryCache();

const { mutate, asyncStatus } = useMutation({
  mutation: (text: string) => createTodo(text),
  onSettled: () => {
    queryCache.invalidateQueries({ key: ['todos'] });
  },
});

// mutate('Acheter du café');
```

**Pourquoi `onSettled`** : il tourne que la mutation réussisse ou échoue, ce qui
garantit que la liste finit toujours réconciliée avec le serveur. Invalider
marque la query *stale* et déclenche sa revalidation — tu ne recharges pas la
donnée toi-même, tu déclares seulement qu'elle n'est plus de confiance.

Pour une UI instantanée, les **mises à jour optimistes** écrivent le résultat
attendu dans le cache dès `onMutate`, avant la réponse serveur. En capturant un
instantané du cache, `onError` peut annuler la modification si la requête échoue,
et `onSettled` invalide pour se resynchroniser. Le principe est robuste ; garde
la doc sous les yeux pour la signature exacte d'écriture du cache.

## Face à un composable fetch maison

:::compare
::bad
```ts
function useTodos() {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);
  async function load() {
    loading.value = true;
    try { data.value = await getTodos(); }
    catch (e) { error.value = e; }
    finally { loading.value = false; }
  }
  load();
  return { data, error, loading, load };
}
// Recopié par domaine, aucun cache partagé,
// deux composants = deux requêtes, revalidation à écrire à la main.
```
::
::good
```ts
function useTodos() {
  return useQuery({ key: ['todos'], query: getTodos });
}
// Cache partagé par clé, déduplication, revalidation SWR,
// invalidation depuis les mutations — sans boilerplate.
```
::
:::

Le composable maison reste parfait pour un cas isolé, sans partage ni cache.
Mais dès que plusieurs écrans lisent les mêmes données, ou que des mutations
doivent les rafraîchir, tu réimplémentes lentement un cache — et un cache maison
est un nid à bugs. Autant prendre celui qui gère déjà déduplication, fraîcheur et
invalidation.

## À retenir

Pinia Colada transforme le data-fetching impératif en déclaratif : tu nommes une
donnée par sa clé, la bibliothèque s'occupe du cache partagé, de la
déduplication, de la fraîcheur et de la revalidation. `useQuery` pour lire,
`useMutation` + `invalidateQueries` pour écrire et resynchroniser. Le tout intégré
à Pinia, réactif de bout en bout, sans le trio `data/error/loading` recopié
partout.

:::cheatsheet
- title: "useQuery({ key, query })"
  desc: "Lecture déclarative ; le cache est partagé par clé."
- title: "state vs asyncStatus"
  desc: "L'état de la donnée d'un côté, la requête en vol de l'autre."
- title: "staleTime"
  desc: "Durée de fraîcheur : sous ce délai, aucune requête relancée."
- title: "gcTime"
  desc: "Durée de survie en cache sans observateur, puis suppression."
- title: "useMutation + invalidateQueries"
  desc: "Muter, puis marquer les queries liées comme périmées."
- title: "Clé fonction"
  desc: "key: () => [...] réexécute la query quand la clé change."
:::
