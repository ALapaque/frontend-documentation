---
title: "Architecture du state"
slug: "state-architecture"
framework: "vue"
level: "senior"
order: 6
duration: 19
prerequisites: ["pinia", "composables"]
updated: 2026-05-22
seoTitle: "Architecture du state — vue"
seoDescription: "Architecturer l'état avec Pinia : stores modulaires, composition entre stores, et persistance via un plugin Pinia."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "state-architecture"
  - framework: "angular"
    slug: "architecture"
---

L'enjeu n'est pas « quel store » mais « comment découper ». Un état applicatif mal architecturé devient un god-store que tout le monde importe et que personne n'ose modifier. Pinia donne les briques (stores, getters, actions, plugins) ; l'architecture consiste à les arranger en modules à responsabilité unique, composables entre eux, et à externaliser les préoccupations transverses (persistance, logging) dans des plugins.

## Stores modulaires : une responsabilité par store

Un store = un domaine. On découpe par bounded context (auth, panier, catalogue), pas par écran. Le style `setup` rend chaque store lisible comme un composable.

```ts
// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const estConnecte = computed(() => Boolean(token.value))

  async function login(creds: Credentials) {
    const res = await api.login(creds)
    user.value = res.user
    token.value = res.token
  }

  function logout() {
    user.value = null
    token.value = null
  }

  return { user, token, estConnecte, login, logout }
})
```

Le store `setup` expose un état (`ref`), des dérivés (`computed` = getters) et des actions (fonctions). Chaque store est une unité testable et importable à la demande. Pinia ne charge que les stores réellement utilisés (tree-shaking), donc multiplier les petits stores ne coûte rien.

## Composer des stores entre eux

Un store peut en consommer un autre : on appelle simplement son hook à l'intérieur. C'est ainsi qu'on évite la duplication d'état tout en gardant les domaines séparés.

```ts
// stores/panier.ts
export const usePanierStore = defineStore('panier', () => {
  const auth = useAuthStore()        // composition de store
  const lignes = ref<Ligne[]>([])

  const peutCommander = computed(() =>
    auth.estConnecte && lignes.value.length > 0
  )

  async function valider() {
    if (!peutCommander.value) return
    await api.commander(lignes.value, auth.token!)
    lignes.value = []
  }

  return { lignes, peutCommander, valider }
})
```

`usePanierStore` dépend de `useAuthStore` sans dupliquer le token ni l'état de connexion. La dépendance est explicite et unidirectionnelle ; éviter les cycles (A dépend de B et B de A) qui rendent l'init indéterministe. Cette composition remplace la hiérarchie de modules imbriqués de l'ancien Vuex par de simples appels de fonctions.

:::compare
::bad
```ts
// God-store : un seul store fourre-tout
export const useAppStore = defineStore('app', () => {
  const user = ref(null)
  const panier = ref([])
  const produits = ref([])
  const notifications = ref([])
  // ... 40 actions, tout couplé, impossible à tree-shaker
})
```
::
::good
```ts
// Stores par domaine, composés à la demande
useAuthStore()      // auth.ts
usePanierStore()    // panier.ts (consomme auth)
useCatalogueStore() // catalogue.ts
useNotifsStore()    // notifs.ts
```
::
:::

**Pourquoi** : un god-store crée un couplage maximal — tout composant qui touche une portion importe et dépend de l'ensemble, et tout changement risque d'impacter des préoccupations sans rapport. Pinia identifie chaque store par son `id` unique et le charge paresseusement à son premier `useXxxStore()` ; un store unique annule ce découpage et empêche le tree-shaking. Des stores par domaine isolent les responsabilités : on teste `auth` sans monter `catalogue`, on raisonne sur des frontières claires, et les dépendances entre domaines deviennent des appels explicites qu'on peut auditer. Le découpage par domaine reflète le modèle métier, pas l'arborescence d'écrans, ce qui le rend stable dans le temps.

## Persistance via un plugin Pinia

La persistance (localStorage, sessionStorage) est une préoccupation transverse : elle ne doit pas polluer chaque store. Un plugin Pinia s'injecte une fois et s'applique à tous les stores ciblés.

```ts
// plugins/persist.ts
import type { PiniaPluginContext } from 'pinia'
import { watch } from 'vue'

export function persistPlugin({ store, options }: PiniaPluginContext) {
  if (!options.persist) return // opt-in via option du store

  const cle = `pinia:${store.$id}`
  const sauvegarde = localStorage.getItem(cle)
  if (sauvegarde) store.$patch(JSON.parse(sauvegarde))

  watch(
    () => store.$state,
    (state) => localStorage.setItem(cle, JSON.stringify(state)),
    { deep: true },
  )
}
```

```ts
// main.ts
import { createPinia } from 'pinia'
const pinia = createPinia()
pinia.use(persistPlugin)

// stores/auth.ts — opt-in
export const useAuthStore = defineStore('auth', () => { /* ... */ }, {
  persist: true,
})
```

Un plugin reçoit le contexte de chaque store à sa création : il peut lire `store.$state`, le patcher (`$patch`), et l'observer (`watch`). Ici, hydratation depuis `localStorage` à la création, puis sauvegarde réactive à chaque mutation. L'opt-in par `options.persist` évite de persister des stores éphémères. En production, on utilise généralement `pinia-plugin-persistedstate`, mais en écrire un montre le mécanisme : la persistance, le logging, l'undo/redo sont tous des plugins.

:::callout{type="tip"}
En SSR (Nuxt), attention à ne persister/hydrater que côté client : `localStorage` n'existe pas sur le serveur. Garde le plugin derrière `import.meta.client` ou un guard équivalent.
:::

## Code source

Pinia est concis (`vuejs/pinia`, `packages/pinia/src/`) :

- `store.ts` — `defineStore` et `createSetupStore`/`createOptionsStore` : c'est là que l'état renvoyé par la fonction setup est rendu réactif, que `$state`, `$patch`, `$subscribe` et `$onAction` sont attachés à l'instance.
- `rootStore.ts` — `createPinia` et le registre `pinia._s` (Map des stores actifs) ; on y voit comment un store est instancié une seule fois puis mémoïsé par `id`, ce qui explique le chargement paresseux.
- `createPinia` expose `pinia.use(plugin)` qui pousse dans `pinia._p` ; chaque plugin de ce tableau est appelé à la création de chaque store avec le `PiniaPluginContext`. Lire la boucle d'application des plugins dans `store.ts` clarifie l'ordre d'exécution (state hydraté avant que le composant n'y accède).

Pinia s'appuie entièrement sur `@vue/reactivity` : un store est, au fond, un objet `reactive` enrichi d'API d'instance. Comprendre `effectScope` (utilisé pour scoper les effets d'un store et permettre son `$dispose`) éclaire la gestion de cycle de vie côté SSR.

:::cheatsheet
- title: "defineStore('id', setup)"
  desc: "Un store = un domaine ; state/getters/actions via ref/computed/fn."
- title: "Composition de stores"
  desc: "Appeler useXxxStore() dans un autre ; dépendance explicite, pas de cycle."
- title: "$state / $patch / $subscribe"
  desc: "API d'instance pour lire, muter en lot et observer un store."
- title: "pinia.use(plugin)"
  desc: "Préoccupations transverses (persist, log) appliquées à tous les stores."
- title: "options.persist"
  desc: "Opt-in par store ; le plugin lit/écrit localStorage via $patch + watch."
:::
