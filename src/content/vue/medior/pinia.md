---
title: "Pinia"
slug: "pinia"
framework: "vue"
level: "medior"
order: 5
duration: 16
prerequisites: ["composables"]
updated: 2026-05-22
seoTitle: "Pinia — stores, getters, plugins (Medior Vue)"
seoDescription: "Le store officiel de Vue : définir un store, ses getters et ses actions, sans le boilerplate de Vuex."
ogVariant: "gold"
related:
  - { framework: "react", slug: "server-state" }
  - { framework: "angular", slug: "dependency-injection" }
---

## Un store, c'est un composable global

Pinia reprend la forme d'un composable, mais l'instance est **partagée**. Le
style `setup` est le plus naturel.

```js
export const useCart = defineStore('cart', () => {
  const items = ref([]);
  const total = computed(() => items.value.reduce((s, i) => s + i.price, 0));
  function add(item) { items.value.push(item); }
  return { items, total, add };
});
```

```vue
<script setup>
const cart = useCart();
</script>
<template>{{ cart.total }}</template>
```

## Getters = computed, actions = méthodes

:::cheatsheet
- title: "state (ref)"
  desc: "La source de vérité du store."
- title: "getters (computed)"
  desc: "Valeurs dérivées mises en cache."
- title: "actions (functions)"
  desc: "Mutations et logique, synchrone ou async."
- title: "plugins"
  desc: "Étendre tous les stores (persistance, logging…)."
:::

## Ne déstructure pas sans storeToRefs

Déstructurer un store casse la réactivité de son state, comme pour `reactive`.

:::compare
::bad
```js
const { total } = useCart(); // total n'est plus réactif
```
::
::good
```js
const { total } = storeToRefs(useCart()); // reste réactif
```
::
:::

:::callout{type="tip"}
Garde tes stores **petits et ciblés** (un par domaine). Un store géant
redevient un god-object difficile à tester. La persistance se branche en plugin
plutôt que codée dans chaque action.
:::
