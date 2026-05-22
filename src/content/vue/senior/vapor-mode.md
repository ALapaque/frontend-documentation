---
title: "Vapor mode"
slug: "vapor-mode"
framework: "vue"
level: "senior"
order: 2
duration: 19
prerequisites: ["reactivity-internals"]
updated: 2026-05-22
seoTitle: "Vue Vapor — le mode sans virtual DOM"
seoDescription: "Vapor compile les composants en opérations DOM directes : ce qui change, et ce qui ne change pas."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "compiler" }
  - { framework: "angular", slug: "change-detection" }
---

## Sans virtual DOM

Le mode classique de Vue rend un arbre virtuel puis le diff. Vapor **compile**
le template en instructions DOM directes : créer le nœud une fois, puis ne
mettre à jour que les parties liées à un état réactif.

## Le même code, une autre compilation

Tu écris le même `<script setup>`. C'est la sortie du compilateur qui diffère :
pas de v-nodes, pas de diff, des effets ciblés branchés directement sur le DOM.

```vue
<!-- opt-in par composant via l'attribut vapor -->
<script setup vapor>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

Introduit avec Vue 3.6 — **encore en beta** au moment d'écrire (la dernière
version stable est 3.5), donc à ne pas mettre en prod aveuglément. Vapor s'active
par composant (`<script setup vapor>`) et exige le runtime Vapor au montage. Un composant Vapor et un composant v-node
peuvent cohabiter, mais le franchissement de frontière a un coût d'interop — d'où
le déploiement par îlots.

:::cheatsheet
- title: "Pas de virtual DOM"
  desc: "Le template devient des opérations DOM impératives générées au build."
- title: "Réactivité fine"
  desc: "Une mise à jour ne touche que les nœuds liés à la valeur changée."
- title: "Moins de runtime"
  desc: "Bundle et mémoire réduits : pas de diff à embarquer."
:::

### Idée reçue : « Vapor change ma façon d'écrire »

Non. L'API (refs, computed, composables) est identique. Vapor est une stratégie
de **compilation**, activable par composant — pas un nouveau langage.

:::callout{type="warn"}
Vapor cible les apps sensibles à la perf et au poids du bundle. Il a des limites
d'interop avec l'écosystème v-node existant : adopte-le par îlots, là où le gain
est mesurable, pas en big bang.
:::

## Code source

Suivre `vuejs/core-vapor` et la sortie du compilateur (`@vue/compiler-vapor`)
montre concrètement comment un template devient des appels DOM — un excellent
miroir du React Compiler côté React.
