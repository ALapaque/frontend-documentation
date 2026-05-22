---
title: "Nuxt SSR"
slug: "nuxt-ssr"
framework: "vue"
level: "senior"
order: 3
duration: 21
prerequisites: ["reactivity-internals"]
updated: 2026-05-22
seoTitle: "Nuxt SSR — ISR, hybrid rendering, server routes"
seoDescription: "Le rendu Nuxt à la carte : SSR, ISR, prerender et server routes, choisis par route."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "react", slug: "rsc" }
---

## Le rendu à la carte

La force de Nuxt, c'est le **rendu hybride** : tu choisis la stratégie par route
via `routeRules`, sans changer ton code de page.

```ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },              // statique au build
    '/blog/**': { isr: 3600 },             // régénéré toutes les heures
    '/admin/**': { ssr: true },            // rendu serveur à chaque requête
    '/api/**': { cors: true },
  },
});
```

:::cheatsheet
- title: "prerender"
  desc: "HTML généré au build. Le plus rapide, pour le contenu stable."
- title: "isr"
  desc: "Incremental Static Regeneration : statique + régénération périodique."
- title: "ssr"
  desc: "Rendu à chaque requête, pour le contenu personnalisé."
- title: "swr"
  desc: "Sert le cache, revalide en arrière-plan."
:::

## Data fetching sans double requête

Le piège SSR par excellence : fetcher dans `onMounted` ou un simple `$fetch` au
top-level refait l'appel au client après l'avoir fait au serveur. `useAsyncData`
/ `useFetch` exécutent la requête côté serveur, **sérialisent le résultat dans
le payload**, puis l'hydratent côté client sans refetch.

:::compare
::bad
```vue
<script setup>
// double appel : serveur ET client, état non transféré
const data = ref(null)
onMounted(async () => { data.value = await $fetch('/api/stats') })
</script>
```
::
::good
```vue
<script setup>
// fetch une fois côté serveur, hydraté via le payload
const { data, pending, error } = await useFetch('/api/stats')
</script>
```
::
:::

**Pourquoi** : `$fetch` brut n'est rattaché à aucun cache de payload — le serveur rend, puis le client remonte et refait l'appel, doublant la charge et risquant un flash. `useFetch` enregistre le résultat sous une `key` dans `nuxtApp.payload` ; à l'hydratation, le client lit le payload au lieu de refetcher. Donne une `key` stable pour les requêtes paramétrées, et `useAsyncData` quand la logique de fetch est custom.

:::callout{type="warn"}
Toute donnée non déterministe lue pendant le rendu (`Date.now()`, `Math.random()`,
`window`) provoque un **hydration mismatch** : le HTML serveur diffère du rendu
client, Vue jette l'arbre et re-rend. Isole ces valeurs derrière `import.meta.client`
ou `<ClientOnly>`.
:::

## Server routes

Nuxt embarque un serveur (Nitro). Une fonction dans `server/api/` devient un
endpoint — pas besoin de backend séparé pour de la logique légère.

```ts
// server/api/health.get.ts
export default defineEventHandler(() => ({ status: 'ok' }));
```

:::callout{type="warn"}
Attention au state partagé côté serveur : une variable au module est partagée
entre **toutes** les requêtes. Utilise `useState` (Nuxt) pour un état par
requête, et ne mets jamais de données utilisateur dans un singleton de module.
:::

## Code source

Nitro (le moteur serveur sous Nuxt) et H3 (sa couche HTTP) sont des projets à
part. Lire leur doc éclaire le déploiement edge et la frontière exacte entre
rendu Vue et runtime serveur.
