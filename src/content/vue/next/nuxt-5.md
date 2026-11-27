---
title: "Nuxt 5 : ce qui arrive"
slug: "nuxt-5"
framework: "vue"
level: "next"
order: 2
duration: 15
prerequisites: ["nuxt-ssr", "nitro-h3"]
updated: 2026-11-27
seoTitle: "Nuxt 5 — compatibilityVersion 5, Nitro v3 et nuxt/server : préparer la migration"
seoDescription: "Nuxt 5 n'est pas encore publié, mais Nuxt 4.5 à 4.7 en livrent l'essentiel derrière future.compatibilityVersion: 5. Ce que le drapeau bascule, le passage à Nitro v3 et h3 v2, nuxt/server, et un plan de préparation concret."
ogVariant: "iris"
related:
  - { framework: "vue", slug: "nuxt4-data" }
  - { framework: "vue", slug: "vue-3-6" }
  - { framework: "tooling", slug: "tooling-2027" }
  - { framework: "react", slug: "nextjs-app-router" }
---

Nuxt 5 a une particularité : il n'est pas encore publié, et tu peux pourtant en
faire tourner l'essentiel dès aujourd'hui. Depuis l'été 2026, l'équipe livre les
changements de la prochaine majeure **dans Nuxt 4**, derrière des drapeaux. La
bonne question n'est donc plus « quand sort Nuxt 5 ? », mais « qu'est-ce qui
casse chez moi, et puis-je le savoir maintenant ? ». Ce module trie ce qui
change, ce qui se teste déjà, et dans quel ordre t'y préparer.

:::callout{type="warn"}
**Statut en novembre 2026.** Nuxt 5 est « en cours de développement ». La roadmap
officielle classe la 5.x en *scheduled*, avec une sortie initiale « Q4 2026
(estimated) » : une estimation, pas un engagement. Au 27 novembre 2026, le tag
`latest` de npm pointe sur la **4.7.0** et aucune 5.x n'est publiée. Tout ce qui
suit décrit des défauts testables derrière un drapeau, pas une version stable.
:::

## Où en est Nuxt 5

Le plan est annoncé de longue date : Nuxt 4 comme version de stabilité, puis un
Nuxt 5 qui porte le passage à **Nitro v3**. Deux repères pour planifier : **Nuxt 3
est en fin de vie depuis le 31 juillet 2026** (plus de correctifs ni de patchs de
sécurité), et **Nuxt 4 sera maintenu six mois après la sortie de la 5.x**. C'est
ta fenêtre de migration.

Entre-temps, trois mineures ont livré presque tout Nuxt 5 derrière des options :

- **4.5 (18 juillet 2026)** : Vite 8, `unhead` v3, SSR streaming expérimental,
  codes d'erreur stables.
- **4.6 (5 octobre 2026)** : `nuxt/server`, sessions, `$fetch` typé reconstruit,
  Vapor en interop, Nuxt CLI v4.
- **4.7 (23 novembre 2026)** : build avec Nitro v3, `runtimeConfig` validé par
  schéma, error boundary côté serveur, Nuxt CLI 4.1.

## `future.compatibilityVersion: 5` : les défauts de demain

Disponible depuis Nuxt 4.2, ce drapeau n'installe pas Nuxt 5 : il **bascule les
valeurs par défaut** de ta config sur celles de la future majeure. Chaque option
reste réglable une par une, ce qui permet d'avancer par étapes.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 5,
  },
})
```

Ce qui a le plus de chances de te toucher :

- **Vite Environment API** (`experimental.viteEnvironmentApi`) : les plugins Vite
  s'enregistrent et se configurent par environnement.
- **Routing sensible à la casse** : `/About` ne correspond plus à
  `pages/about.vue`, comme côté serveur.
- **`$fetch` typé reconstruit** (`experimental.routeTypedFetch`) : le `body`, la
  `query` et les `headers` que le handler valide sont vérifiés à l'appel.
- **Payload extrait côté client** (`experimental.payloadExtraction: 'client'`) :
  pour une page prérendue ou en cache, il est inliné dans le HTML au premier
  rendu ; `_payload.json` ne sert plus qu'à la navigation client.
- **Early return de `navigateTo`** (`experimental.navigateToEarlyReturn`) : dans
  un `<script setup>`, un `await navigateTo()` réussi arrête la suite du setup,
  `defineExpose` et hooks enregistrés plus bas compris.
- **Error boundary côté serveur** (`experimental.ssrErrorBoundary`) : la réponse
  reste un `200`, le slot `#error` de `<NuxtErrorBoundary>` remplace le composant
  fautif et le client s'hydrate dans le même état.
- **Options API retirée du bundle client** : si un composant, le tien ou celui
  d'une dépendance, l'utilise encore, réactive-la avec `vue.optionsApi: true`.

## Le socle serveur : Nitro v3 et h3 v2

Le drapeau ne couvre pas tout : aucune option n'active le changement de moteur
serveur, le seul que le guide de migration classe en impact « Significant ».
Nitro v3 est une réécriture bâtie sur srvx et h3 v2, avec les API Web standard
`Request`/`Response` de bout en bout ; le paquet `nitropack` devient `nitro`.
Les bases sont dans [Nitro & H3](/vue/senior/nitro-h3), sur la génération actuelle.

Depuis la 4.7, inutile d'attendre Nuxt 5 pour essayer : lance `npm install nitro`.
Si `nitro` figure dans ton `package.json`, Nuxt builde avec Nitro v3 ; retire-le
et tu reviens à Nitro v2. Aucune config à toucher.

:::callout{type="warn"}
**Novembre 2026.** L'équipe qualifie ce build de *highly experimental*, et Nitro
v3 est lui-même encore en release candidate (`3.0.261103-rc` sur npm). À essayer
sur une branche, pas en production.
:::

La plupart des apps et des modules ont été écrits pour Nitro v2 et h3 v1. Sur
Nuxt 4, Nitro v3 tourne donc avec une couche de compatibilité, `nitroLegacy`,
activée par défaut : les imports depuis `h3`, `nitropack` et `#imports`, ainsi
que `useRuntimeConfig(event)` et `event.node`, continuent de fonctionner. Une
fois l'app stable, passe `nitroLegacy: false` pour débusquer le code qui en
dépend. Sur Nuxt 5, comme avec `compatibilityVersion: 5`, la logique s'inverse :
la couche est coupée par défaut, et c'est toi qui l'actives le temps de migrer.

### Ce que la couche ne rattrape pas : les route rules

Nitro v3 lit les motifs de `routeRules` autrement, et `nitroLegacy` n'y change rien.

:::compare
::bad
```ts
// Écrit pour Nitro v2 : le sens change avec Nitro v3
routeRules: {
  '/blog/*': { swr: 3600 },          // couvre désormais /blog/2026/hello
  '/api/*/items/**': { cors: true }, // deux jokers : le build s'arrête
}
```
::
::good
```ts
// Nitro v3 : un paramètre nommé cible un seul segment
routeRules: {
  '/blog/:slug': { swr: 3600 },
  '/api/:id/items/**': { cors: true },
}
```
::
:::

**Pourquoi.** Avec Nitro v3, un `*` seul couvre n'importe quel nombre de segments
au lieu d'un seul : une règle peut s'appliquer à plus de chemins qu'avant, ou à
moins. Le build signale chaque clé concernée (`NUXT_B4029`), y compris celles
qu'un module ajoute, et refuse un motif à plusieurs jokers. Relis en priorité les
règles `cache`, `swr`, `isr`, `redirect` et `appMiddleware` : un changement de
portée y devient un bug de fraîcheur ou de sécurité. Les stratégies elles-mêmes
sont décrites dans [Nuxt SSR](/vue/senior/nuxt-ssr).

### `nuxt/server` : du code serveur qui survit à la majeure

Le vrai outil de préparation date de la 4.6. `nuxt/server` est une surface
d'import pour le code serveur, le pendant de `nuxt/app` : tu n'importes plus
depuis `h3` ni `nitropack`, donc le même fichier tourne sous Nitro v2, Nitro v3
et Nuxt 5.

```diff
+ import { createError, defineHandler, getQuery } from 'nuxt/server'
+
- export default defineEventHandler((event) => {
+ export default defineHandler((event) => {
    const { name } = getQuery<{ name?: string }>(event)
-   if (!name) throw createError({ statusCode: 400, statusMessage: 'Bad request' })
+   if (!name) throw createError({ status: 400, statusText: 'Bad request' })
    return { message: `Hello, ${name}!` }
  })
```

`defineHandler` existe depuis la 4.7 ; `defineEventHandler` reste exporté comme
alias, le renommage est donc facultatif. L'`event` est un `RequestEvent`
portable : `event.req` est une `Request`, `event.url` une `URL`, et les en-têtes
de réponse passent par `event.res.headers`. Attention, `sendRedirect` **renvoie**
la réponse au lieu de l'envoyer : écris `return sendRedirect(event, '/login')`.
Sur Nuxt 4, importe toujours **explicitement** depuis `nuxt/server` : les noms
auto-importés sont encore ceux de h3 v1, qui manipulent un autre `event`, et le
mélange des deux échoue avec une erreur `NUXT_E8012`.

**Pourquoi** c'est stratégique : Nuxt possède désormais sa propre API serveur au
lieu d'exposer celle de h3 et de Nitro, et un module qui l'utilise n'a plus de
peer dependency sur `h3` ou `nitropack`. La surface reste volontairement
réduite : pour `useStorage` ou `defineCachedEventHandler`, tu importes encore
depuis `h3` ou `nitropack/runtime`, et ce handler sera à revoir sur Nuxt 5.

## Déjà utilisable en 4.x, sans le drapeau

**Runtime config validé (4.7).** Toute valeur de `runtimeConfig` peut être un
Standard Schema (Zod, Valibot, ArkType). Le schéma fixe le type et la valeur par
défaut ; si une variable manque ou ne se convertit pas, **le serveur ne démarre
pas** et liste tout ce qui ne va pas en une seule erreur.

```ts
// nuxt.config.ts
import { z } from 'zod'

export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: z.string(), // requis : doit être défini au runtime
    public: {
      mode: z.enum(['preview', 'production']).default('production'),
    },
  },
})
```

**Sessions et `appSecret` (4.6).** `runtimeConfig.appSecret`, alimenté par
`NUXT_APP_SECRET`, devient le secret racine de l'app. Premier usage :
`useSession(event)`, importé de `nuxt/server`, scelle la session dans un cookie
`nuxt-session`, sans stockage serveur, dans la limite de 4096 octets.

**SSR streaming, codes d'erreur, Vapor.** `experimental.ssrStreaming: true`
(4.5) envoie tout de suite le shell HTML, puis diffuse le corps au fil du rendu.
Contrepartie : statut et en-têtes partent avec le premier octet, donc un
`setResponseStatus()` appelé pendant le rendu n'atteint plus le client. Depuis la
4.5 aussi, erreurs et avertissements portent un code stable (`NUXT_E1001`,
`NUXT_B5001`…) avec cause et correctif. Enfin, `vue: { vapor: true }` (4.6)
active Vapor en interop, par composant : voir [Vue 3.6](/vue/next/vue-3-6).

:::callout{type="warn"}
**Novembre 2026.** `ssrStreaming` est expérimental et désactivé par défaut. Vapor
exige Vue `^3.6.0-rc.2`, et Vue 3.6 est toujours en release candidate : le tag
`latest` de npm reste sur la 3.5.
:::

## Outillage : CLI v4, DevTools v4, overlay

- **Nuxt CLI v4** (avec la 4.6) : panneau interactif dans le terminal, `--no-tui`
  pour l'ancien affichage. La 4.1 (avec la 4.7) unifie la sortie de `nuxt build`.
- **Nuxt DevTools v4**, reconstruit sur Devframe et Vite DevTools : livré avec
  Nuxt 5, installable dès la 4.5 via `npx nuxt module add @nuxt/devtools@4`.
- **Overlay de dev** (4.7) : erreurs de type (`typescript.typeCheck`), checkers
  Vite comme ESLint et avertissements du compilateur Vue dans le même badge.

## Plan de préparation

1. **Monte en 4.7** avec `npx nuxt upgrade --dedupe`, sur un Node.js que Nuxt 5
   accepte : `^22.22.0`, `^24.15.0` ou `>=26.0.0`.
2. **Active le drapeau sur une branche.** Corrige ce qui casse ; si un défaut te
   bloque, désactive son option le temps d'avancer.
3. **Porte le code serveur vers `nuxt/server`** : imports explicites,
   `createError({ status, statusText })`, `return sendRedirect(…)`.
4. **Ajoute `nitro`**, déclare dans `package.json` chaque paquet importé côté
   serveur, relis les avertissements `NUXT_B4029`, puis coupe `nitroLegacy`.
5. **Vérifie tes modules.** Certains demandent une version compatible Nitro v3,
   par exemple `nuxt-security` 2.7.0 ou plus.

## À retenir

Nuxt 5 se prépare dans Nuxt 4 : le drapeau `compatibilityVersion: 5` révèle les
ruptures côté app, le paquet `nitro` celles du serveur, et `nuxt/server` donne du
code qui passe la majeure tel quel. Rien n'est stable : teste sur une branche.

:::cheatsheet
- title: "future.compatibilityVersion: 5"
  desc: "Bascule les défauts Nuxt 5 sur Nuxt 4 (dès la 4.2). Chaque option reste réglable une par une."
- title: "nuxt/server"
  desc: "Import serveur portable (4.6) : même fichier sous Nitro v2, Nitro v3 et Nuxt 5. Explicite sur Nuxt 4."
- title: "Nitro v3 + nitroLegacy"
  desc: "Ajoute le paquet nitro (4.7) pour builder avec ; coupe nitroLegacy pour trouver le code lié à Nitro v2. Très expérimental."
- title: "Route rules"
  desc: "Nouvelle syntaxe : /blog/* couvre les chemins imbriqués, /blog/:slug un seul segment."
- title: "Statut — nov. 2026"
  desc: "5.x « scheduled », estimée Q4 2026, rien sur npm. Nuxt 3 en fin de vie, 4.x maintenue 6 mois après la 5."
:::
