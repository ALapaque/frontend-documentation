---
title: "Vue Router : data loaders et routes typées"
slug: "vue-router-5"
framework: "vue"
level: "medior"
order: 14
duration: 16
prerequisites: ["router"]
updated: 2026-07-09
seoTitle: "Vue Router en 2026 — Data Loaders, routes typées et navigation moderne"
seoDescription: "La nouvelle génération de Vue Router : les Data Loaders (defineLoader) qui découplent le chargement de données de la navigation et suppriment les cascades, les routes typées de bout en bout, et ce que ça change côté architecture."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "router" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

Le modèle de routing que tu connais a trois frictions. D'abord, la donnée se charge dans `onMounted` : la navigation résout la route, le composant se monte, *puis* le fetch part. C'est une cascade navigation → montage → requête, et si un composant enfant charge lui aussi ses données, la cascade s'allonge. Ensuite, les guards par route (`beforeEnter`) deviennent verbeuses dès qu'on veut bloquer l'affichage tant que la donnée n'est pas prête. Enfin, `route.params.id` est typé `string | string[]` quelle que soit la route : aucune garantie que le paramètre existe, aucune autocomplétion sur les noms de route, des chaînes magiques partout.

Deux évolutions de Vue Router répondent à ça : les **Data Loaders** (le chargement devient une propriété de la route) et les **routes typées** (les types sont générés depuis ta table de routes). Voyons le mécanisme et son statut réel.

## Le problème de la cascade

Regarde le flux classique. Le composant est monté d'abord, la donnée arrive après.

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const user = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  user.value = await getUser(route.params.id) // part APRÈS le montage
  isLoading.value = false
})
</script>
```

Le composant s'affiche vide, gère lui-même son `isLoading`, et rien ne relance le fetch quand `route.params.id` change sans démontage (Vue Router réutilise l'instance). Chaque page réimplémente la même plomberie loading/error. La navigation ne sait rien de la donnée : elle a « fini » avant que le fetch commence.

## Data Loaders : la navigation devient data-aware

Un Data Loader déclare le chargement **au niveau de la route**. Le loader s'exécute dans un guard de navigation, donc **en parallèle** de la résolution de la route — pas après le montage. Le composant reçoit une donnée déjà prête.

```ts
// loaders/user.ts
import { defineBasicLoader } from 'vue-router/experimental'
import { getUser } from '@/api/users'

export const useUserData = defineBasicLoader(
  (to, { signal }) => getUser(to.params.id, { signal }),
  { key: 'user' },
)
```

Le loader est exporté depuis la page ; le plugin le collecte et l'attend dans le guard. Dans le composant, on consomme un composable qui expose l'état de façon centralisée.

```vue
<script setup lang="ts">
import { useUserData } from '@/loaders/user'

const { data: user, isLoading, error, reload } = useUserData()
</script>

<template>
  <p v-if="error">{{ error.message }}</p>
  <UserCard v-else-if="user" :user="user" />
</template>
```

**Pourquoi c'est différent :** le fetch ne dépend plus du cycle de vie du composant. Il démarre quand la navigation démarre, pas quand le DOM est monté. Le paramètre `signal` (un `AbortSignal`) annule la requête si l'utilisateur renavigue avant la fin — plus de réponse obsolète qui écrase la bonne. Et parce que le loader vit dans le guard, la navigation peut être **bloquante** (attendre la donnée avant d'afficher la nouvelle page, comme un rendu serveur) ou **non bloquante** (afficher tout de suite, la donnée se remplit ensuite). Ce choix est déclaré au niveau de la route, pas dispersé dans chaque composant.

Le loader doit être activé explicitement à l'installation :

```ts
import { DataLoaderPlugin } from 'vue-router/experimental'

app.use(DataLoaderPlugin, { router })
app.use(router) // le plugin s'enregistre AVANT le router
```

### defineBasicLoader vs defineColadaLoader

`defineBasicLoader` est l'implémentation minimale : elle réexécute la fonction à chaque navigation vers la route. Simple, sans dépendance, adaptée pour démarrer.

`defineColadaLoader` s'appuie sur [Pinia Colada](https://pinia-colada.esm.is/) et ajoute cache, déduplication et invalidation. La `key` est une fonction de la route, ce qui donne un cache par paramètre.

```ts
import { defineColadaLoader } from 'vue-router/experimental'
import { getUser } from '@/api/users'

export const useUserData = defineColadaLoader({
  key: (to) => ['users', to.params.id],
  query: (to, { signal }) => getUser(to.params.id, { signal }),
  staleTime: 30_000, // donnée fraîche 30 s : pas de refetch inutile
})
```

Le composable renvoie en plus `status` (`'pending' | 'success' | 'error'`) et `refresh` (recharge si la donnée est périmée). Deux navigations vers le même utilisateur ne déclenchent qu'une requête ; une mutation ailleurs peut invalider la clé et forcer un rechargement ciblé.

:::callout{type="info"}
Les Data Loaders sont **expérimentaux** et vivent sous l'entrée `vue-router/experimental`. L'API fait encore l'objet d'un RFC ouvert et peut changer. Le POURQUOI vaut d'être compris dès maintenant ; l'adoption en production demande de suivre le RFC.
:::

## Routes typées : plus de chaînes magiques

Les routes typées reposent sur la génération de types depuis ta table de routes. En routing basé fichiers, l'outillage produit un fichier `typed-router.d.ts` qui décrit chaque route : son nom, son chemin, et le type exact de ses `params`. `router.push`, `RouterLink` et `useRoute` deviennent alors typés de bout en bout.

:::compare
::bad
```ts
// 'produit' est une chaîne libre : une faute de frappe compile
router.push({ name: 'produit', params: { id: 42 } })

const route = useRoute()
route.params.id // string | string[] — type large, rien n'est garanti
route.params.slog // aucune erreur : param inexistant, mais toléré
```
::
::good
```ts
// nom autocomplété depuis la table de routes ; params vérifiés
router.push({ name: '/produits/[id]', params: { id: '42' } })

const route = useRoute('/produits/[id]')
route.params.id // string — garanti présent par la définition de route
route.params.slog // erreur TypeScript : ce param n'existe pas
```
::
:::

**Pourquoi ça tient :** les types ne sont pas écrits à la main, ils sont **dérivés** de la source de vérité (les fichiers de routes). Renommer ou supprimer une route casse la compilation partout où elle est référencée, au lieu de produire un `undefined` silencieux à l'exécution. Les chaînes magiques disparaissent parce que l'éditeur les propose et les valide.

:::callout{type="tip"}
Le fichier généré doit être inclus dans le `tsconfig.json` (dans `include`), sinon l'éditeur ne voit pas les types. Un plugin Volar (`unplugin-vue-router/volar/...`) type aussi `useRoute()` et `$route` directement dans les composants de page, sans annotation manuelle.
:::

## Ce que ça change côté architecture

Mises ensemble, ces deux évolutions déplacent l'unité de raisonnement : **la route devient l'unité de chargement**, pas le composant. C'est le modèle qu'ont popularisé Remix et TanStack Router — la route sait quelle donnée elle a besoin, la charge en amont, et fournit un composant qui n'a plus qu'à afficher.

Concrètement :

- Le composant ne gère plus son propre `onMounted` + `isLoading` + `error`. Cette logique est centralisée dans le loader, réutilisable et testable isolément.
- La cascade navigation → montage → fetch disparaît : les loaders d'une même route s'exécutent en parallèle, pendant la navigation.
- Le typage relie l'URL à la donnée : un `params.id` typé alimente un loader qui produit une donnée typée. La chaîne URL → paramètre → requête → vue est vérifiée par le compilateur.

La contrepartie : la donnée n'est plus « dans le composant ». Il faut penser en termes de route et de dépendances de chargement, ce qui rapproche l'architecture d'un framework full-stack comme Nuxt (voir `nuxt-ssr`).

## Statut réel en 2026

À manier avec la version exacte en tête :

- **Vue Router 5** est publié comme version stable (`latest`, 5.1.x). C'est une **release de transition** qui fusionne le routing typé basé fichiers (issu de `unplugin-vue-router`) dans le paquet cœur. Pour un projet Vue Router 4 qui n'utilise pas `unplugin-vue-router`, il n'y a **pas de rupture** : la mise à jour est surtout un changement de chemins d'import. Vue Router 6 est annoncé comme ESM-only et retirera les API dépréciées.
- **Les routes typées** sont matures mais dépendent encore de l'outillage de build. `unplugin-vue-router` reste en `0.x` (pré-1.0) : le cœur file-based/typed est solide, l'API périphérique peut bouger.
- **Les Data Loaders** restent **expérimentaux** (`vue-router/experimental`, RFC ouvert). Utilisables et déjà éprouvés dans des exemples Nuxt, mais l'API n'est pas figée.

:::callout{type="warn"}
Ne pas conclure « Vue Router 5 = data loaders stables ». Vue Router 5 est stable ; les data loaders, eux, sont opt-in et expérimentaux derrière un import séparé. Distingue les deux avant de t'appuyer dessus en production.
:::

## À retenir

Le chargement de données quitte le composant pour rejoindre la route. Un Data Loader s'exécute pendant la navigation, en parallèle, avec `AbortSignal` et gestion centralisée de loading/error — fini la cascade `onMounted`. Les routes typées dérivent leurs types de la table de routes : `push`, `RouterLink` et `useRoute` deviennent autocomplétés et vérifiés. L'unité de chargement devient la route, comme chez Remix/TanStack Router. Statut à respecter : Vue Router 5 stable, routes typées matures (outillage en 0.x), data loaders expérimentaux.

:::cheatsheet
- title: "defineBasicLoader"
  desc: "Loader minimal, réexécuté à chaque navigation ; import depuis vue-router/experimental."
- title: "defineColadaLoader"
  desc: "Loader avec cache/dédup via Pinia Colada : key(to), query(to), staleTime."
- title: "DataLoaderPlugin"
  desc: "app.use(DataLoaderPlugin, { router }) AVANT app.use(router) — opt-in requis."
- title: "Navigation bloquante / non bloquante"
  desc: "Le loader vit dans le guard : attendre la donnée ou afficher tout de suite, choisi par route."
- title: "Routes typées"
  desc: "typed-router.d.ts généré ; params et noms de route vérifiés, plus de chaînes magiques."
- title: "Statut 2026"
  desc: "Vue Router 5 stable (transition) ; routes typées matures (uvr en 0.x) ; data loaders expérimentaux (RFC)."
:::
