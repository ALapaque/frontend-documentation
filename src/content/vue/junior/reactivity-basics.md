---
title: "Réactivité : les bases"
slug: "reactivity-basics"
framework: "vue"
level: "junior"
order: 2
duration: 12
prerequisites: ["template-syntax"]
updated: 2026-05-22
seoTitle: "ref vs reactive — Guide Junior Vue"
seoDescription: "ref et reactive expliqués : pourquoi .value, et lequel choisir."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "state-basics" }
---

## ref : une valeur réactive

`ref()` enveloppe une valeur dans un conteneur réactif. Dans le `<script>`, tu y
accèdes via `.value` ; dans le `<template>`, Vue le déballe pour toi.

```vue
<script setup>
import { ref } from 'vue';
const count = ref(0);
function inc() { count.value++; }
</script>

<template>
  <button @click="inc">{{ count }}</button>
</template>
```

## reactive : un objet réactif

`reactive()` rend un objet réactif en profondeur, sans `.value`. Mais il ne
marche que sur des objets, et perd sa réactivité si tu le déstructures.

:::compare
::bad
```js
const state = reactive({ count: 0 });
const { count } = state;  // count n'est plus réactif
```
::
::good
```js
const state = reactive({ count: 0 });
state.count++;            // OK : on garde l'accès via l'objet
```
::
:::

:::cheatsheet
- title: "ref(value)"
  desc: "Tout type. Accès via .value en script. Le choix par défaut."
- title: "reactive(obj)"
  desc: "Objets/tableaux uniquement. Pas de .value, mais fragile à la déstructuration."
:::

:::callout{type="tip"}
En cas de doute, prends `ref`. Il marche pour les primitives comme pour les
objets, et `.value` rend explicite que tu manipules une référence réactive.
:::
