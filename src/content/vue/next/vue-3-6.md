---
title: "Vue 3.6"
slug: "vue-3-6"
framework: "vue"
level: "next"
order: 1
duration: 13
prerequisites: ["reactivity-internals", "vapor-mode"]
updated: 2026-05-22
seoTitle: "Vue 3.6 — Vapor mode, réactivité alien-signals (beta)"
seoDescription: "Vue 3.6 : Vapor mode complet (parité VDOM sauf Suspense), cœur réactif réécrit sur alien-signals, intégration Vite renforcée. En beta."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "react", slug: "react-labs" }
---

:::callout{type="warn"}
Vue 3.6 est en **beta** (la dernière version stable est 3.5). Vapor y est
« feature-complete » mais toujours considéré **instable**. À tester, pas à
mettre en prod aveuglément.
:::

## Vapor mode, complet (ou presque)

C'est la pièce maîtresse de la 3.6. Vapor **compile** les composants en
opérations DOM directes — sans virtual DOM — et atteint en benchmarks tiers le
niveau de Solid et Svelte 5. En 3.6 beta, Vapor a la **parité fonctionnelle**
avec le mode VDOM stable… à une exception près : `<Suspense>`.

```vue
<script setup vapor>
import { ref } from 'vue'
const count = ref(0)
</script>
<template><button @click="count++">{{ count }}</button></template>
```

:::callout{type="tip"}
100 % opt-in et **mixable** : un composant Vapor peut vivre dans un arbre VDOM
et inversement. Migre par îlots les sous-arbres sensibles à la perf. Un
composant Vapor peut être rendu dans un `<Suspense>` VDOM, mais Vapor seul ne
gère pas encore Suspense.
:::

## Cœur réactif réécrit (alien-signals)

`@vue/reactivity` est refondu sur une base inspirée d'**alien-signals** :
graphe de dépendances plus efficace, moins d'allocations, mémoire en baisse,
déclenchements plus rares. L'API publique (`ref`, `computed`, `watch`) ne
change pas — c'est une amélioration interne qui prolonge la réécriture entamée
en 3.5.

## Le reste

:::cheatsheet
- title: "Vapor mode"
  desc: "Compilation DOM directe, parité VDOM sauf Suspense. Opt-in par composant."
- title: "Réactivité alien-signals"
  desc: "Refonte interne de @vue/reactivity : perf + mémoire, API inchangée."
- title: "Intégration Vite"
  desc: "Couplage build/runtime renforcé."
- title: "Statut"
  desc: "3.6 en beta ; Vapor feature-complete mais instable."
:::

:::callout{type="info"}
Pour te préparer : rien à réécrire. L'intérêt de Vapor est d'être **invisible**
côté code — tu actives `vapor` sur les composants où la perf compte, le reste
ne bouge pas.
:::
