---
title: "La couche de données de Nuxt 4"
slug: "nuxt4-data"
framework: "vue"
level: "senior"
order: 10
duration: 16
prerequisites: ["nuxt-ssr"]
updated: 2026-07-09
seoTitle: "Nuxt 4 data layer — useFetch, useAsyncData, cache et hydratation sans double fetch"
seoDescription: "Maîtriser le chargement de données dans Nuxt 4 : useFetch vs useAsyncData vs $fetch, le transfert d'état serveur→client sans double requête, la déduplication par clé, getCachedData, refresh et l'architecture du data layer."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "nuxt-ssr" }
  - { framework: "vue", slug: "pinia-colada" }
---

En SSR, le piège central n'est pas de charger la donnée : c'est de la charger
**deux fois**. Le serveur rend le HTML avec les données, puis le client remonte à
l'hydratation et refait le même appel — double charge réseau, flash possible,
backend frappé en double à chaque page. Nuxt règle ça avec une clé de transfert
d'état, mais il faut comprendre le modèle pour ne pas le court-circuiter.

## `$fetch` : l'appel HTTP brut

`$fetch` est l'instance globale d'[ofetch](https://github.com/unjs/ofetch) :
parsing JSON, gestion d'erreur, et un raccourci côté serveur — un `$fetch` vers
une route Nitro locale appelle le handler directement, sans aller-retour HTTP.
C'est l'outil parfait pour une **mutation** (`$fetch(url, { method: 'POST' })`)
dans un gestionnaire d'événement, ou un appel imbriqué depuis une server route.

Le problème apparaît dès qu'on s'en sert **seul** pour charger la donnée d'une
page au top-level du `setup` : rien ne relie `$fetch` au payload. Le serveur
exécute la requête et rend le HTML, puis le client la réexécute à l'hydratation.
Personne ne transfère le résultat de l'un à l'autre.

## `useAsyncData` / `useFetch` : le transfert d'état

C'est le rôle des deux composables. Ils exécutent la fonction async **côté
serveur**, sérialisent le résultat dans `nuxtApp.payload.data[clé]` (via `devalue`,
qui gère `Date`, `Map`, `Set`, `RegExp` et les refs Nuxt), puis, à l'hydratation,
le client **lit le payload au lieu de refetcher** — une seule requête pour le
rendu et son hydratation.

:::compare
::bad
```vue
<script setup lang="ts">
// $fetch nu : serveur ET client exécutent la requête, aucun état transféré
const post = ref(null)
onMounted(async () => {
  post.value = await $fetch(`/api/posts/${route.params.id}`)
})
</script>
```
::
::good
```vue
<script setup lang="ts">
// fetch une fois côté serveur, hydraté depuis le payload → une seule requête
const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
</script>
```
::
:::

`useFetch` n'est que du **sucre** : `useFetch(url)` équivaut à peu près à
`useAsyncData(url, () => $fetch(url))`, avec une clé dérivée de l'URL. Passe à
`useAsyncData` dès que la logique est custom (CMS, SDK, `Promise.all` de plusieurs
endpoints sous une clé explicite) — là, tu écris le handler.

## La clé, cœur de la déduplication

La **clé** est l'identité de la donnée dans le payload et le cache : elle retrouve
le résultat sérialisé à l'hydratation et déduplique les appels concurrents.

- `useFetch` génère sa clé depuis l'URL + les options.
- `useAsyncData` prend la clé en **premier argument**. Sans clé (handler direct),
  Nuxt en fabrique une depuis le fichier et la ligne d'appel — pratique, mais
  opaque et fragile si tu déplaces le code.
- La clé peut être **réactive** (un getter `() => \`post:\${id.value}\``) : quand
  elle change, Nuxt réexécute et met en cache chaque résultat par valeur.

Depuis Nuxt 4, tous les appels partageant la **même clé** partagent les mêmes
refs `data`, `status` et `error` : trois composants qui demandent `'user'` en même
temps ne déclenchent qu'**une** requête et voient le même objet. Au démontage du
dernier consommateur, Nuxt nettoie automatiquement l'entrée du cache.

:::callout{type="warn"}
Une clé explicite doit être **stable** et **unique par donnée**. Deux `useFetch`
de ressources différentes sous la même clé se marchent dessus ; à l'inverse, une
clé qui change à chaque rendu casse le transfert d'état et ramène le double fetch.
Pour une donnée paramétrée, inclus le paramètre : `useAsyncData(\`post:\${id}\`, ...)`.
:::

## L'état retourné et le mode d'exécution

Les deux composables renvoient le même contrat : `data` (le résultat, ou `null`),
`status` (`'idle' | 'pending' | 'success' | 'error'`, à préférer au booléen
historique `pending`), `error`, `refresh()` / `execute()` pour relancer, et
`clear()` qui remet `data`/`error` à `undefined` et `status` à `'idle'`.

Par défaut, l'appel est **bloquant** : le `await` suspend le `setup` via
`<Suspense>`, donc la navigation attend la donnée — le bon défaut pour du contenu
SSR indexable, le HTML part rempli. Le mode **lazy** (`lazy: true`, ou les alias
`useLazyFetch` / `useLazyAsyncData`) ne bloque pas : la page s'affiche tout de
suite et tu gères le chargement à la main via `status`, idéal pour de la donnée
secondaire hors du chemin critique. À l'opposé, `server: false` sort la requête
du rendu serveur — elle ne part qu'au client, hors payload, pour une donnée
purement cliente (préférences, géoloc).

## `getCachedData` : ne pas recharger en navigation client

Le payload sert **une fois**, à l'hydratation. Si l'utilisateur revient sur une
page déjà visitée, `useAsyncData` refetch — le cache par défaut ne couvre pas la
navigation client. Pour l'éviter, fournis `getCachedData`, qui décide si une
valeur en cache suffit.

```ts
const { data } = await useAsyncData('post-list', () => $fetch('/api/posts'), {
  getCachedData(key, nuxtApp, ctx) {
    const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    // resert le cache, sauf sur un refresh manuel explicite
    return ctx.cause === 'refresh:manual' ? undefined : cached
  },
})
```

Depuis Nuxt 4, `getCachedData` est appelé à **chaque** déclenchement — pas
seulement au montage — et reçoit un contexte dont `cause` vaut `'initial'`,
`'watch'`, `'refresh:manual'` ou `'refresh:hook'`. Tu peux ainsi resservir le
cache en navigation mais forcer un refetch au clic « actualiser », ou coder un
`staleTime` maison. L'option `dedupe` gère les appels concurrents sur une clé :
`'cancel'` annule la requête en vol, `'defer'` attend celle déjà en cours.

## Quand passer à Pinia Colada

`useAsyncData` reste une couche de fetch **liée au cycle de vie des composants** :
cache de payload, déduplication par clé, un peu de contrôle via `getCachedData`.
Dès que le besoin devient un vrai **cache applicatif** — `staleTime` / `gcTime`
déclaratifs, invalidation par clés hiérarchiques, mutations avec mises à jour
optimistes, partage transversal indépendant du montage — c'est le signal de
passer à [Pinia Colada](https://pinia-colada.esm.dev/).

Son module Nuxt gère le SSR : `useQuery` s'appuie sur `onServerPrefetch`, donc la
requête se résout côté serveur **sans `await` explicite** (là où `useAsyncData`
suspend via le `await`). On y gagne `useQuery` pour les lectures, `useMutation`
pour les écritures et une invalidation fine — Nuxt s'oriente d'ailleurs vers cet
écosystème comme socle de sa future couche de données.

:::callout{type="info"}
Ne mélange pas les rôles : `useAsyncData` **fetch et met en cache**, il ne
déclenche pas d'effets de bord — appeler une action Pinia dans le handler vaut
des réexécutions surprises, parfois avec des valeurs nulles.
:::

## Un mot sur la structure `app/`

Nuxt 4 déplace le code applicatif (pages, composants, composables, `useState`)
dans un dossier `app/` — nouveau `srcDir` — tandis que `server/` (routes Nitro
appelées par `$fetch`) reste à la racine : la frontière rendu/serveur devient
lisible dans l'arborescence, sans rien changer aux composables ci-dessus.

## À retenir

`$fetch` seul pour charger une page = double fetch en SSR. `useFetch` /
`useAsyncData` fetchent côté serveur, sérialisent sous une **clé** dans le payload
et hydratent le client sans refetch. La clé est l'identité de la donnée : stable,
unique, réactive au besoin. `getCachedData` couvre la navigation ; au-delà, Pinia
Colada offre un vrai cache. `useState`, lui, gère l'état partagé SSR-safe.

:::cheatsheet
- title: "$fetch"
  desc: "ofetch brut. Mutations et appels dans un handler. Seul au setup = double fetch."
- title: "useFetch"
  desc: "Sucre de useAsyncData + $fetch. Clé dérivée de l'URL. Cas courant."
- title: "useAsyncData"
  desc: "Handler custom + clé explicite. Agrégation, SDK, CMS."
- title: "clé"
  desc: "Identité dans le payload et le cache. Stable, unique, éventuellement réactive."
- title: "getCachedData"
  desc: "Décide si le cache suffit ; reçoit la cause (initial/watch/refresh). Évite le refetch en navigation."
- title: "lazy / server:false"
  desc: "Non bloquant / requête client only. Gère status à la main."
- title: "Pinia Colada"
  desc: "staleTime, invalidation, mutations optimistes. SSR sans await explicite."
:::
