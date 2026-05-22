---
title: "Nitro & H3"
slug: "nitro-h3"
framework: "vue"
level: "senior"
order: 4
duration: 18
prerequisites: ["nuxt-ssr"]
updated: 2026-05-22
seoTitle: "Nitro & H3 — vue"
seoDescription: "Nitro, le moteur serveur sous Nuxt, et H3 : defineEventHandler, presets de déploiement, build portable et exécution edge."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "rsc"
  - framework: "angular"
    slug: "ssr-hydration"
---

Sous chaque app Nuxt tourne Nitro : un moteur serveur indépendant du framework, qui compile l'application en un serveur portable déployable n'importe où — Node, Workers, Lambda, Deno — sans changer une ligne. H3 est la couche HTTP minimaliste de Nitro : un routeur et un modèle d'event handler conçus pour rester légers et universels.

## H3 : defineEventHandler

Toute route serveur Nuxt (`server/api/*`, `server/routes/*`) est un handler H3. Un handler reçoit un `event` qui encapsule la requête et la réponse, indépendamment de la plateforme sous-jacente.

```ts
// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)

  const user = await db.users.find(id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Introuvable' })
  }

  setResponseHeader(event, 'Cache-Control', 'max-age=60')
  return user // sérialisé en JSON automatiquement
})
```

L'objet `event` n'est pas un `req`/`res` Node : c'est une abstraction (`H3Event`) que les utilitaires (`getQuery`, `readBody`, `setResponseHeader`) manipulent de façon portable. Retourner une valeur la sérialise ; `throw createError(...)` produit une réponse d'erreur structurée. Le suffixe `.get` dans le nom de fichier restreint la méthode HTTP.

## Nitro : un serveur portable

Nitro compile le code serveur, les routes API et le rendu en un répertoire `.output` autonome. Il fait du tree-shaking sur le serveur, génère des routes typées et bundle les dépendances. Le même code source produit des artefacts différents selon la cible.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages', // change la cible de build
    storage: {
      cache: { driver: 'redis', url: process.env.REDIS_URL },
    },
    routeRules: {
      '/blog/**': { swr: 3600 },        // stale-while-revalidate côté serveur
      '/admin/**': { ssr: false },      // SPA pour cette branche
      '/api/**': { cors: true },
    },
  },
})
```

`routeRules` applique des stratégies par motif d'URL : ISR, SWR, redirections, en-têtes, désactivation du SSR — sans toucher au code. La couche `storage` est une KV unifiée (`useStorage()`) dont le driver varie selon l'environnement. C'est cette indirection qui rend le déploiement edge transparent.

## Presets et déploiement edge

Un preset décrit comment empaqueter `.output` pour une plateforme. Nitro auto-détecte souvent la cible (Vercel, Netlify) ; sinon on la force via `preset`.

:::compare
::bad
```ts
// Code couplé à l'API Node : casse sur edge (Workers/Deno)
import { readFileSync } from 'node:fs'
export default defineEventHandler(() => {
  return readFileSync('/var/data/config.json', 'utf8') // pas de fs sur edge
})
```
::
::good
```ts
// Storage Nitro : même API, driver adapté à la plateforme
export default defineEventHandler(async () => {
  return await useStorage('data').getItem('config.json')
})
```
::
:::

**Pourquoi** : les runtimes edge (Cloudflare Workers, Deno Deploy) n'exposent pas l'API `node:fs` ni les globals Node — ils tournent sur le standard Web (Fetch, Request/Response, V8 isolates). Un code qui appelle `readFileSync` est lié à Node et plante au déploiement edge. La couche `useStorage` de Nitro abstrait l'accès derrière un driver remplaçable au build selon le preset : `fs` en local/Node, KV namespace sur Cloudflare, etc. En programmant contre l'abstraction portable plutôt que contre l'API plateforme, le même handler tourne partout. C'est tout l'intérêt de Nitro : écrire une fois, déployer sur n'importe quelle cible.

:::callout{type="tip"}
Pour l'edge, préfère les utilitaires H3/Nitro (`useStorage`, `$fetch`, Web Crypto) aux modules `node:*`. Beaucoup de presets edge polyfillent partiellement Node, mais s'appuyer dessus rend le déploiement fragile.
:::

## Code source

Nitro vit dans `unjs/nitro` ; H3 dans `unjs/h3`. Les points d'entrée à lire :

- `h3` — `src/event/event.ts` définit la classe `H3Event` qui enveloppe `Request`/réponse de façon plateforme-agnostique ; `src/handler.ts` expose `defineEventHandler` et la normalisation des valeurs retournées en réponse HTTP.
- `nitro` — `src/build/` contient la logique de bundling (Rollup) et le tree-shaking serveur ; `src/presets/` regroupe un fichier par cible de déploiement (`cloudflare-pages`, `vercel`, `node-server`, `deno-deploy`), chacun décrivant entry, hooks de build et format de sortie.
- `unjs/unstorage` — implémente la couche `useStorage` et ses drivers ; lire `src/drivers/` montre comment un même contrat KV est satisfait par `fs`, `redis`, `cloudflare-kv-binding`, etc.

Côté Nuxt, `packages/nuxt/src/core/nitro.ts` est le pont qui configure l'instance Nitro à partir de `nuxt.config`, injecte les routes serveur et branche le rendu SSR comme un handler H3 parmi d'autres.

:::cheatsheet
- title: "defineEventHandler"
  desc: "Handler H3 ; reçoit un H3Event portable, retourne la réponse."
- title: "createError"
  desc: "throw pour une réponse d'erreur structurée (statusCode/message)."
- title: "preset"
  desc: "Cible de build Nitro : node-server, cloudflare-pages, vercel, deno..."
- title: "routeRules"
  desc: "Stratégies par URL : ssr, swr, isr, redirect, headers — sans code."
- title: "useStorage"
  desc: "KV portable ; driver remplaçable selon la plateforme."
:::
