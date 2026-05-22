---
title: "Composition vs Options"
slug: "composition-vs-options"
framework: "vue"
level: "medior"
order: 1
duration: 15
prerequisites: ["reactivity-basics"]
updated: 2026-05-22
seoTitle: "Composition API vs Options API — Medior Vue"
seoDescription: "Les deux styles d'écriture Vue comparés : organisation, réutilisation et quand choisir lequel."
ogVariant: "gold"
related:
  - { framework: "react", slug: "hooks-rules" }
  - { framework: "angular", slug: "signals" }
---

## Deux façons d'écrire le même composant

L'Options API organise un composant par **type d'option** (`data`, `methods`,
`computed`). La Composition API l'organise par **fonctionnalité**, dans `setup`.

:::compare
::bad
```js
// Options : la logique d'une feature est éparpillée
export default {
  data: () => ({ count: 0 }),
  computed: { double() { return this.count * 2; } },
  methods: { inc() { this.count++; } },
};
```
::
::good
```js
// Composition : tout ce qui touche au compteur est regroupé
const count = ref(0);
const double = computed(() => count.value * 2);
function inc() { count.value++; }
```
::
:::

## Le vrai gain : la réutilisation

L'Options API réutilise via les mixins — au prix de collisions de noms et d'une
origine floue. La Composition API extrait la logique dans des **composables**,
des fonctions explicites.

:::cheatsheet
- title: "Options API"
  desc: "Lisible pour de petits composants ; structure imposée ; mixins fragiles."
- title: "Composition API"
  desc: "Logique regroupée par feature ; réutilisation via composables ; meilleur typage TS."
:::

### Idée reçue : « la Composition API remplace l'Options API »

Les deux restent supportées. Mais pour du code typé, réutilisable et qui passe à
l'échelle, la Composition API (avec `<script setup>`) est la recommandation
actuelle.

:::callout{type="tip"}
Le typage TypeScript est nettement meilleur en Composition API : pas de `this`
magique, l'inférence suit naturellement tes `ref` et `computed`.
:::
