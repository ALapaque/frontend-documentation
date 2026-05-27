---
title: "Vue 3.6"
slug: "vue-3-6"
framework: "vue"
level: "next"
order: 1
duration: 13
prerequisites: ["reactivity-internals", "vapor-mode"]
updated: 2026-05-23
seoTitle: "Vue 3.6 — Vapor mode, réactivité alien-signals, Rolldown"
seoDescription: "Vue 3.6 : Vapor mode (compile-to-DOM, sans VDOM) mûrit vers le stable, cœur réactif réécrit sur alien-signals, intégration Vite/Rolldown resserrée."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "react", slug: "react-labs" }
---

:::callout{type="info"}
Vue 3.6 introduit **Vapor mode** et un cœur réactif réécrit. Mi-2026, Vapor
**mûrit vers le stable** : feature-complete et utilisable, mais opt-in et encore
en stabilisation côté écosystème (devtools, libs tierces). Active-le par îlots,
pas en bascule globale aveugle.
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
Limite connue : la parité avec le VDOM est quasi complète, **`<Suspense>`**
restant le point sensible — un composant Vapor peut vivre dans un `<Suspense>`
VDOM, mais Vapor seul ne le gère pas encore pleinement.

:::callout{type="tip"}
100 % opt-in et **mixable** : un composant Vapor peut vivre dans un arbre VDOM
et inversement (`vapor` sur le `<script setup>`). Migre par îlots les sous-arbres
sensibles à la perf ; le reste de l'app ne bouge pas.
:::

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
  desc: "Compile-to-DOM sans VDOM ; updates ciblées par binding. Parité VDOM sauf Suspense. Opt-in par composant."
- title: "Réactivité alien-signals"
  desc: "Refonte interne de @vue/reactivity : moins d'allocations, mémoire en baisse. API inchangée."
- title: "Vite / Rolldown"
  desc: "Couplage build/runtime renforcé, alignement sur le bundler Rust Rolldown."
- title: "Statut"
  desc: "3.6 livrée ; Vapor mûrit vers le stable, encore opt-in."
:::

:::callout{type="info"}
Pour te préparer : rien à réécrire. L'intérêt de Vapor est d'être **invisible**
côté code — l'API et les SFC ne changent pas. Tu actives `vapor` là où la perf
compte, tu valides que tes libs tierces du sous-arbre sont compatibles, et le
reste continue sur VDOM.
:::
