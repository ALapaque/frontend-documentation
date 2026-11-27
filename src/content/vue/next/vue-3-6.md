---
title: "Vue 3.6"
slug: "vue-3-6"
framework: "vue"
level: "next"
order: 1
duration: 13
prerequisites: ["reactivity-internals", "vapor-mode"]
updated: 2026-11-27
seoTitle: "Vue 3.6 — Vapor mode, réactivité alien-signals, Rolldown"
seoDescription: "Vue 3.6 toujours en Release Candidate fin novembre 2026 (rc.16) : Vapor mode (compile-to-DOM, sans VDOM) feature-complete, activé via createVaporApp ou vaporInteropPlugin, cœur réactif réécrit sur alien-signals, intégration Vite/Rolldown resserrée. Pas de date de sortie stable annoncée."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "react", slug: "react-labs" }
---

:::callout{type="info"}
Vue 3.6 introduit **Vapor mode** et un cœur réactif réécrit. La branche est en
**Release Candidate** depuis le 18 juillet 2026 et y est toujours fin novembre :
seize RC publiées (`3.6.0-rc.16` le 20 novembre), `latest` pointe encore sur la
3.5 (`3.5.46`) et aucune date de sortie stable n'est annoncée à ce jour. Vapor
est feature-complete, mais les RC enchaînent les correctifs — et la rc.2 a
introduit une rupture. Active-le par îlots, pas en bascule globale aveugle.
:::

## Vapor mode : compile-to-DOM, sans virtual DOM

C'est la pièce maîtresse de la 3.6. Vapor **compile** les composants en
opérations DOM directes — **pas de virtual DOM, pas de diff d'arbre**. À la
place, le compilateur génère du code qui crée les nœuds une fois et n'attache
des mises à jour qu'aux endroits réellement liés à un signal réactif. En
benchmarks, Vapor se place au niveau de Solid et Svelte 5.

```vue
<script setup vapor>
import { ref } from 'vue'
const count = ref(0)
</script>
<template><button @click="count++">{{ count }}</button></template>
```

L'attribut `vapor` ne suffit pas : il faut aussi le bon runtime au montage. Une
app entièrement Vapor démarre avec `createVaporApp()`, sans embarquer le
runtime virtual DOM :

```ts
import { createVaporApp } from 'vue'
import App from './App.vue'

createVaporApp(App).mount('#app')
```

Une app VDOM existante, créée avec `createApp()`, doit installer
`vaporInteropPlugin` pour accueillir des composants Vapor :

```ts
import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'

createApp(App).use(vaporInteropPlugin).mount('#app')
```

Côté SFC, `<script vapor>` est un raccourci de `<script setup vapor>`, et
l'attribut peut aussi se poser sur `<template vapor>`.

:::compare
::bad
```vue
<!-- VDOM : à chaque update, re-exécution du render, nouvel arbre virtuel,
     diff avec l'ancien, puis patch du DOM. Coût proportionnel à la taille
     du template, même si une seule valeur a changé. -->
<script setup>
const count = ref(0)
</script>
```
::
::good
```vue
<!-- Vapor : le compilateur sait que seul ce text node dépend de count.
     L'update touche ce nœud précis, sans arbre virtuel ni diff. -->
<script setup vapor>
const count = ref(0)
</script>
```
::
:::

**Pourquoi.** Le virtual DOM est un filet de sécurité : il recompare tout l'arbre
pour trouver le minimum à patcher, parce qu'il ne sait pas *a priori* ce qui a
changé. Avec une réactivité fine, cette ignorance disparaît — le compilateur
relie chaque binding à son signal et n'émet que la mise à jour exacte. On
supprime le coût du render + diff, et on baisse les allocations (pas de vnodes).

:::callout{type="tip"}
100 % opt-in et **mixable** : une fois `vaporInteropPlugin` installé, un
composant Vapor peut vivre dans un arbre VDOM et inversement (`vapor` sur le
`<script setup>`). Migre par îlots les sous-arbres sensibles à la perf ; le
reste de l'app ne bouge pas.
:::

## Ce que Vapor ne prend pas en charge

Vapor couvre volontairement un **sous-ensemble** de Vue. Les notes de la rc.1
listent ce qui n'est pas pris en charge, ou ne s'applique pas :

- l'**Options API** ;
- `app.config.globalProperties` ;
- `getCurrentInstance()`, qui renvoie `null` dans un composant Vapor ;
- les événements de cycle de vie par élément (`@vue:xxx`) ;
- `v-memo` ;
- `$el`, `$props`, `$attrs`, `$slots` et `$refs` sur une ref de template de
  composant.

`<Suspense>` reste côté VDOM : pas de prise en charge en mode Vapor seul, mais
un composant Vapor peut vivre dans un `<Suspense>` VDOM.

Autre différence à connaître : depuis la rc.2, les écouteurs d'événements sont
attachés directement aux éléments, comme en VDOM. La délégation au niveau
`document` devient opt-in, avec le modificateur `.delegate`
(`@click.delegate="onClick"`).

## Depuis la rc.1 : ce qui a bougé

- **rc.2 (22 juillet)** : délégation d'événements en opt-in, option
  `compilerOptions.eventDelegation` supprimée. Une rupture en pleine RC.
- **rc.11 (10 octobre)** : le compilateur avertit quand `v-memo` est ignoré.
- **rc.13 (23 octobre)** : le code d'interop est éliminé du bundle quand
  `vaporInteropPlugin` n'est pas utilisé.
- **rc.14 (30 octobre)** : hooks devtools pour les composants Vapor.
- **Le reste, jusqu'à la rc.16** : surtout des correctifs (hydratation, slots,
  transitions, `KeepAlive`, Suspense en interop) et des optimisations.

L'écosystème suit : Nuxt 4.6 (5 octobre 2026) prend en charge Vapor en mode
interop (`vue: { vapor: true }` dans `nuxt.config.ts`), et Vue Router a ajouté
un mode Vapor en 5.5.2 (26 novembre 2026).

## Cœur réactif réécrit sur alien-signals

`@vue/reactivity` est refondu sur une base inspirée d'**alien-signals** : graphe
de dépendances plus compact, propagation « pull » paresseuse, moins
d'allocations, mémoire en baisse et déclenchements plus rares (déduplication des
notifications). L'API publique (`ref`, `computed`, `watch`, `effect`) **ne
change pas** — c'est une amélioration interne qui prolonge la réécriture entamée
en 3.5 et qui sert de fondation à la perf de Vapor.

**Pourquoi.** Vapor n'a de sens que si la couche réactive sous-jacente est elle
aussi minimale : pas la peine de supprimer le diff VDOM si chaque écriture de
`ref` reste coûteuse. Le moteur alien-signals rapproche le coût d'une
notification du strict nécessaire — c'est le socle qui rend le gain Vapor réel.

## Intégration Vite / Rolldown resserrée

La 3.6 resserre le couplage build/runtime avec Vite, et s'aligne sur
**Rolldown** (le bundler Rust qui remplace progressivement Rollup/esbuild dans
Vite). En pratique : builds plus rapides, et un pipeline unique qui comprend la
compilation Vapor de bout en bout.

:::cheatsheet
- title: "Vapor mode"
  desc: "Compile-to-DOM sans VDOM ; updates ciblées par binding. Sous-ensemble de Vue, sans Options API. Opt-in par composant."
- title: "Activation"
  desc: "Attribut vapor sur script ou template, puis createVaporApp() ou vaporInteropPlugin dans une app createApp()."
- title: "Réactivité alien-signals"
  desc: "Refonte interne de @vue/reactivity : moins d'allocations, mémoire en baisse. API inchangée."
- title: "Vite / Rolldown"
  desc: "Couplage build/runtime renforcé, alignement sur le bundler Rust Rolldown."
- title: "Statut"
  desc: "Fin novembre 2026 : 3.6.0-rc.16, latest = 3.5.46. Vapor feature-complete, pas de date de sortie stable."
:::

:::callout{type="info"}
Pour te préparer : rien à réécrire tant que tes composants sont en
`<script setup>` et restent dans le sous-ensemble pris en charge. L'intérêt de
Vapor est d'être **invisible** côté code — l'API et les SFC ne changent pas. Tu
installes `vaporInteropPlugin`, tu actives `vapor` là où la perf compte, tu
valides que tes libs tierces du sous-arbre sont compatibles, et le reste
continue sur VDOM.
:::
