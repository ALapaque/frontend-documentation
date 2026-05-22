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
