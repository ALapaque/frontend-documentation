---
title: "Vue Router"
slug: "router"
framework: "vue"
level: "medior"
order: 6
duration: 15
prerequisites: ["components-props", "script-setup"]
updated: 2026-05-22
seoTitle: "Vue Router — vue"
seoDescription: "Vue Router 4 : createRouter, définition des routes, navigation guards beforeEach et lazy loading des routes par import dynamique."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "routing"
  - framework: "angular"
    slug: "routing-basics"
---

Une SPA n'a qu'une page HTML : c'est le routeur qui décide quel composant afficher selon l'URL, sans rechargement. Vue Router 4 est le routeur officiel pour Vue 3. Il mappe des chemins à des composants, gère l'historique du navigateur, et offre des points de contrôle (guards) avant chaque navigation.

## createRouter et installation

On crée une instance avec un mode d'historique et une table de routes, puis on l'installe sur l'app.

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import Accueil from './pages/Accueil.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'accueil', component: Accueil },
    { path: '/produits/:id', name: 'produit', component: () => import('./pages/Produit.vue') },
  ],
})

export default router
```

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

`createWebHistory()` utilise l'API History (URLs propres, nécessite une réécriture côté serveur). `createWebHashHistory()` met tout après un `#` (aucune config serveur). Le segment `:id` est un paramètre dynamique, lu via `route.params.id`.

## Afficher et naviguer

`<RouterView>` est l'emplacement où le composant de la route active se rend. `<RouterLink>` génère les liens. En script, on accède à l'instance via `useRouter` (navigation impérative) et à l'état courant via `useRoute`.

```vue
<!-- App.vue -->
<template>
  <nav>
    <RouterLink to="/">Accueil</RouterLink>
    <RouterLink :to="{ name: 'produit', params: { id: 42 } }">Produit 42</RouterLink>
  </nav>
  <RouterView />
</template>
```

```vue
<!-- Produit.vue -->
<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()   // route.params.id, route.query, route.path
const router = useRouter() // router.push, router.replace, router.back

function valider() {
  router.push({ name: 'accueil' })
}
</script>
```

`useRoute()` renvoie un objet réactif : un `watch` sur `route.params.id` réagit aux changements de paramètre sans remonter le composant. `router.push` empile une entrée d'historique, `router.replace` la remplace.

## Navigation guards : beforeEach

Un guard global s'exécute avant chaque navigation. C'est l'endroit pour l'authentification, les redirections ou la mise à jour du titre. Le guard autorise (`return true`), redirige (`return { name: ... }`) ou bloque (`return false`).

```ts
router.beforeEach((to, from) => {
  const authentifie = Boolean(localStorage.getItem('token'))

  if (to.meta.requiresAuth && !authentifie) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // sinon : autoriser implicitement (return undefined/true)
})
```

```ts
// dans les routes :
{ path: '/admin', component: Admin, meta: { requiresAuth: true } }
```

Le champ `meta` attache des métadonnées arbitraires à une route, lues dans le guard via `to.meta`. Renvoyer un objet de localisation déclenche une redirection ; ne rien renvoyer (ou `true`) laisse passer. Il existe aussi des guards par route (`beforeEnter`) et par composant (`onBeforeRouteLeave`).

:::callout{type="warn"}
Ne jamais déclencher de navigation infinie dans un guard : rediriger `/login` vers `/login` boucle. Vérifie toujours `to.name !== 'login'` avant de rediriger vers la page de connexion.
:::

## Lazy loading des routes

Charger tous les composants de page au démarrage gonfle le bundle initial. Un import dynamique découpe chaque page en chunk chargé à la demande.

:::compare
::bad
```ts
import Dashboard from './pages/Dashboard.vue'

const routes = [
  { path: '/dashboard', component: Dashboard },
]
// Dashboard.vue est dans le bundle initial, même si jamais visité
```
::
::good
```ts
const routes = [
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue') },
]
// chunk séparé, téléchargé uniquement à la navigation
```
::
:::

**Pourquoi** : un `import` statique en haut de fichier est résolu à la compilation et inclus dans le graphe de dépendances du bundle d'entrée — le code part chez l'utilisateur même s'il ne visite jamais la route. La forme `() => import(...)` est un import dynamique : le bundler (Vite/Rollup) la repère et émet un chunk distinct, téléchargé seulement quand le routeur résout cette route. Le bundle initial ne contient plus que le code nécessaire au premier rendu, ce qui réduit le temps jusqu'à l'interactivité. C'est gratuit et systématique pour toute route non critique.

### Idée reçue : « useRoute() n'est pas réactif, il faut remonter le composant à chaque navigation »

Faux. Quand on navigue vers la même route avec des paramètres différents (`/produits/1` → `/produits/2`), Vue Router réutilise l'instance du composant par défaut : il ne le démonte pas. L'objet renvoyé par `useRoute()` est réactif, donc `route.params.id` change tout seul, mais `onMounted` ne se redéclenche pas. Pour relancer une logique (refetch), il faut un `watch(() => route.params.id, ...)`, pas compter sur le cycle de vie. Si l'on veut au contraire forcer un remontage à chaque changement de paramètre, on ajoute une `:key` sur `<RouterView>`.

:::cheatsheet
- title: "createRouter"
  desc: "Instance + history (createWebHistory) + table routes."
- title: "RouterView / RouterLink"
  desc: "Emplacement de rendu et liens déclaratifs."
- title: "useRoute() / useRouter()"
  desc: "État réactif courant / navigation impérative (push, replace)."
- title: "beforeEach((to, from))"
  desc: "Guard global ; return true/objet redirection/false."
- title: "() => import('./Page.vue')"
  desc: "Lazy loading : un chunk par route, chargé à la demande."
:::
