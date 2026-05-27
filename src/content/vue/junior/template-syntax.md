---
title: "Syntaxe des templates"
slug: "template-syntax"
framework: "vue"
level: "junior"
order: 1
duration: 10
prerequisites: []
updated: 2026-05-22
seoTitle: "Syntaxe des templates Vue — Guide Junior"
seoDescription: "Interpolation, directives et événements : la syntaxe de template Vue depuis zéro."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "data-binding" }
  - { framework: "react", slug: "jsx-basics" }
---

## Interpolation et directives

Un template Vue est du HTML augmenté. Les moustaches affichent une valeur, les
directives `v-` ajoutent du comportement.

```vue
<template>
  <h1>{{ title }}</h1>
  <img :src="avatarUrl" :alt="name" />
  <button @click="save">Enregistrer</button>
  <p v-if="loggedIn">Bienvenue</p>
</template>
```

:::cheatsheet
- title: "{{ }}"
  desc: "Interpolation de texte."
- title: ":attr (v-bind)"
  desc: "Lier une valeur dynamique à un attribut/prop."
- title: "@event (v-on)"
  desc: "Écouter un événement."
- title: "v-if / v-for"
  desc: "Conditionnel et liste."
:::

## v-for veut une clé

Comme partout, le rendu de liste a besoin d'une identité stable via `:key`.

:::compare
::bad
```vue
<li v-for="item in items">{{ item.label }}</li>
```
::
::good
```vue
<li v-for="item in items" :key="item.id">{{ item.label }}</li>
```
::
:::

**Pourquoi** : sans `:key`, Vue réutilise les éléments du DOM par position (sa stratégie « in-place patch »). Quand la liste change (insertion, tri, suppression), il patche le mauvais nœud — d'où état décalé, animations cassées ou inputs qui gardent une valeur étrangère. Une `:key` stable et unique donne à chaque item une identité, et Vue déplace le nœud existant au lieu de le réécrire.

:::callout{type="tip"}
`:src` est le raccourci de `v-bind:src`, et `@click` celui de `v-on:click`. Ces
formes courtes sont la convention — utilise-les.
:::
