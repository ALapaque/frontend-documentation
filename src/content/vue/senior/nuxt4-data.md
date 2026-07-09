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
l'hydratation et refait exactement le même appel — double charge réseau, flash
possible, backend frappé en double à chaque page. Nuxt règle ça avec une clé de
transfert d'état, mais il faut comprendre le modèle pour ne pas le
court-circuiter sans le savoir.

## `$fetch` : l'appel HTTP brut

`$fetch` est l'instance globale d'[ofetch](https://github.com/unjs/ofetch) :
parsing JSON, gestion d'erreur, et un raccourci côté serveur — un `$fetch` vers
une route Nitro locale appelle le handler directement, sans aller-retour HTTP.
C'est l'outil parfait pour une **mutation** (POST, PATCH) dans un gestionnaire
d'événement, ou un appel imbriqué depuis une server route.

```ts
async function like(postId: string) {
  await $fetch(`/api/posts/${postId}/like`, { method: 'POST' });
}
```

Le problème apparaît dès qu'on s'en sert **seul** pour charger la donnée d'une
page au top-level du `setup` : rien ne relie `$fetch` au payload. Le serveur
exécute la requête et rend le HTML, puis le client réexécute la même requête à
l'hydratation. Personne ne transfère le résultat de l'un à l'autre.

## `useAsyncData` / `useFetch` : le transfert d'état

C'est le rôle des deux composables. Ils exécutent la fonction async **côté
serveur**, sérialisent le résultat dans `nuxtApp.payload.data[clé]` (via
`devalue`, qui gère `Date`, `Map`, `Set`, `RegExp` et les refs Nuxt), puis, à
l'hydratation, le client **lit le payload au lieu de refetcher**. Une seule
requête réseau pour le rendu serveur et son hydratation.

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
`useAsyncData(url, () => $fetch(url))`. Sa clé est dérivée de l'URL et des
options. Passe à `useAsyncData` dès que la logique de récupération est custom
(client d'un CMS, SDK, plusieurs appels agrégés) — là, tu écris toi-même le
handler, par exemple un `Promise.all` de deux endpoints sous une clé explicite.

## La clé, cœur de la déduplication

La **clé** est l'identité de la donnée dans le payload et dans le cache : elle
retrouve le résultat sérialisé à l'hydratation, et déduplique les appels
concurrents.

- `useFetch` génère sa clé depuis l'URL + les options.
- `useAsyncData` prend la clé en **premier argument**. Sans clé (handler direct),
  Nuxt en fabrique une depuis le fichier et la ligne d'appel — pratique, mais
  opaque et fragile si tu déplaces le code.

Depuis Nuxt 4, tous les appels partageant la **même clé** partagent les mêmes
refs `data`, `status` et `error` : trois composants qui demandent `'user'` en
même temps ne déclenchent qu'**une** requête et voient le même objet. Au démontage
du dernier consommateur, Nuxt nettoie automatiquement l'entrée du cache.

:::callout{type="warn"}
Une clé explicite doit être **stable** et **unique par donnée**. Deux
`useFetch` de ressources différentes sous la même clé se marchent dessus ; à
l'inverse, une clé qui change à chaque rendu casse le transfert d'état et
ramène le double fetch. Pour une donnée paramétrée, inclus le paramètre dans la
clé : `useAsyncData(\`post:\${id}\`, ...)`.
:::

La clé peut aussi être **réactive** — un getter `() => \`post:\${id.value}\`` :
quand elle change, Nuxt réexécute la requête et met en cache chaque résultat
séparément, par valeur.

## L'état retourné et le mode d'exécution

Les deux composables renvoient le même contrat :

- `data` — le résultat (ou `null` tant qu'il n'est pas là).
- `status` — `'idle' | 'pending' | 'success' | 'error'`. Préfère-le à `pending`
  (booléen historique), il porte plus d'information.
- `error` — l'erreur éventuelle.
- `refresh()` / `execute()` — relance la requête à la demande.
- `clear()` — remet `data` à `undefined`, `error` à `undefined`, `status` à
  `'idle'`.

Par défaut, l'appel est **bloquant** : le `await` suspend le `setup` via
`<Suspense>`, donc la navigation attend la donnée avant d'afficher la page — le
bon défaut pour du contenu SSR indexable, le HTML part rempli.

Le mode **lazy** (`lazy: true`, ou les alias `useLazyFetch` /
`useLazyAsyncData`) ne bloque pas : la page s'affiche tout de suite et tu gères
le chargement à la main via `status`. Utile pour de la donnée secondaire (un
panneau latéral) hors du chemin critique du rendu.

:::callout{type="tip"}
`server: false` désactive le rendu serveur de la requête : elle ne part qu'au
client. Combine avec `lazy` pour une donnée purement client (préférences,
géoloc) qui n'a rien à faire dans le payload SSR.
:::

## `getCachedData` : ne pas recharger en navigation client

Par défaut, le payload sert **une fois**, à l'hydratation. Si l'utilisateur
navigue vers une page déjà visitée, `useAsyncData` refetch — le cache par défaut
ne couvre pas la navigation client. Pour l'éviter, fournis `getCachedData`, qui
décide si une valeur en cache suffit.

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
cache en navigation mais forcer un vrai refetch quand l'utilisateur clique
« actualiser ». C'est aussi le levier pour implémenter un `staleTime` maison :
stocke un timestamp et renvoie `undefined` au-delà d'un seuil.

L'option `dedupe` contrôle les appels concurrents sur une même clé :
`'cancel'` annule la requête en vol avant d'en lancer une neuve, `'defer'`
attend celle déjà en cours au lieu d'en démarrer une autre.

## Quand passer à Pinia Colada

`useAsyncData` reste une couche de fetch **liée au cycle de vie des composants** :
cache de payload, déduplication par clé, un peu de contrôle via `getCachedData`.
Dès que le besoin devient un vrai **cache applicatif** — `staleTime` / `gcTime`
déclaratifs, invalidation par clés hiérarchiques, mutations avec mises à jour
optimistes, partage transversal indépendant du montage — c'est le signal de
passer à [Pinia Colada](https://pinia-colada.esm.dev/).

Son module Nuxt gère le SSR : `useQuery` s'appuie sur `onServerPrefetch`, donc la
requête se résout côté serveur **sans `await` explicite** (là où `useAsyncData`
suspend via le `await`). On y gagne un `useQuery` déclaratif pour les lectures,
`useMutation` pour les écritures, une invalidation fine — et Nuxt s'oriente vers
cet écosystème comme socle de sa future couche de données.

:::callout{type="info"}
Ne mélange pas les rôles : `useAsyncData` sert à **fetcher et mettre en cache**,
pas à déclencher des effets de bord (appeler une action Pinia dans le handler te
vaudra des réexécutions surprises, parfois avec des valeurs nulles). Garde le
handler pur.
:::

## Un mot sur la structure `app/`

Nuxt 4 déplace le code applicatif (pages, composants, composables, `useState`)
dans un dossier `app/` — nouveau `srcDir` — tandis que `server/` (routes Nitro,
appelées par `$fetch`) reste à la racine : la frontière rendu/serveur devient
lisible dans l'arborescence, sans rien changer aux composables ci-dessus.

## À retenir

`$fetch` seul pour charger une page = double fetch en SSR. `useFetch` /
`useAsyncData` fetchent côté serveur, sérialisent sous une **clé** dans le
payload et hydratent le client sans refetch. La clé est l'identité de la donnée :
stable, unique, réactive si besoin. `getCachedData` couvre la navigation client ;
au-delà, Pinia Colada offre un vrai cache. Et `useState` reste l'outil pour un
état partagé SSR-safe, distinct du fetch.

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
