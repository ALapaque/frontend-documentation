---
title: "Forms : les bases"
slug: "forms-basics"
framework: "vue"
level: "junior"
order: 6
duration: 12
prerequisites: ["reactivity-basics", "components-props"]
updated: 2026-05-22
seoTitle: "Forms : les bases — vue"
seoDescription: "v-model en Vue 3 : liaison bidirectionnelle sur les inputs, modificateurs .lazy/.number/.trim et v-model sur un composant personnalisé."
ogVariant: "sage"
related:
  - framework: "react"
    slug: "forms-basics"
  - framework: "angular"
    slug: "forms-basics"
---

Un formulaire, c'est de l'état qui doit rester synchronisé avec ce que tape l'utilisateur. Vue fournit `v-model`, une directive qui lie un champ et une variable réactive dans les deux sens : le champ reflète la variable, et toute frappe met la variable à jour.

## v-model sur un input

```vue
<script setup>
import { ref } from 'vue'
const nom = ref('')
</script>

<template>
  <input v-model="nom" />
  <p>Bonjour {{ nom }}</p>
</template>
```

Tape dans le champ, le paragraphe se met à jour à la frappe. Aucune fonction à écrire : c'est la liaison bidirectionnelle.

## Ce que v-model fait vraiment

`v-model` n'est pas magique : c'est du sucre. Sous le capot, il lie l'attribut `value` et écoute l'événement `input`. Écrire ce câblage à la main fonctionne, mais c'est verbeux et source d'oublis.

:::compare
::bad
```vue
<template>
  <input
    :value="nom"
    @input="nom = $event.target.value"
  />
</template>
```
::
::good
```vue
<template>
  <input v-model="nom" />
</template>
```
::
:::

**Pourquoi** : `v-model` génère exactement le couple `:value` + `@input` à la compilation, mais sans surface d'erreur. La version manuelle oblige à écrire `$event.target.value` correctement à chaque champ, gère mal les cas `checkbox`/`select`/`radio` (qui n'utilisent ni `value` ni `input` de la même façon), et duplique la même intention partout. `v-model` choisit la bonne paire propriété/événement selon le type d'élément et reste une seule source de vérité. Moins de code, moins de bugs, comportement uniforme.

## Les modificateurs

`v-model` accepte des modificateurs qui transforment la valeur au passage. Trois sont essentiels.

```vue
<script setup>
import { ref } from 'vue'
const titre = ref('')
const age = ref(0)
const code = ref('')
</script>

<template>
  <!-- .lazy : synchronise sur 'change' (blur) plutôt que 'input' -->
  <input v-model.lazy="titre" />

  <!-- .number : convertit la saisie en nombre -->
  <input v-model.number="age" type="number" />

  <!-- .trim : retire les espaces en début et fin -->
  <input v-model.trim="code" />
</template>
```

`.number` est important : sans lui, un `<input type="number">` renvoie toujours une chaîne (`"42"`, pas `42`). `.trim` évite les espaces parasites collés au copier-coller. `.lazy` réduit la fréquence de mise à jour quand chaque frappe n'a pas besoin d'être traitée.

:::callout{type="tip"}
Les modificateurs se combinent : `v-model.number.lazy="age"` convertit en nombre et ne synchronise qu'à la perte de focus.
:::

## v-model sur un composant

`v-model` ne se limite pas aux balises natives. On peut l'appliquer à un composant pour en faire un champ réutilisable. En Vue 3.4+, la macro `defineModel` gère tout le câblage.

```vue
<!-- ChampDevise.vue -->
<script setup>
const montant = defineModel({ type: Number })
</script>

<template>
  <input
    type="number"
    :value="montant"
    @input="montant = Number($event.target.value)"
  />
  <span>EUR</span>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue'
import ChampDevise from './ChampDevise.vue'
const prix = ref(0)
</script>

<template>
  <ChampDevise v-model="prix" />
  <p>Prix : {{ prix }}</p>
</template>
```

`defineModel` renvoie une `ref` que l'enfant lit et écrit librement ; Vue synchronise automatiquement avec le parent. En interne, cela revient à déclarer une prop `modelValue` et un emit `update:modelValue` — mais sans le verbiage.

:::callout{type="info"}
Avant Vue 3.4, on déclarait manuellement la prop `modelValue` et l'emit `update:modelValue`. `defineModel` est l'équivalent moderne et recommandé.
:::

:::cheatsheet
- title: "v-model"
  desc: "Liaison bidirectionnelle ; sucre pour :value + @input adaptés au type."
- title: ".lazy"
  desc: "Synchronise sur change (blur) au lieu de chaque frappe."
- title: ".number"
  desc: "Convertit la saisie en nombre. Indispensable sur type=number."
- title: ".trim"
  desc: "Supprime les espaces de début et de fin."
- title: "defineModel"
  desc: "v-model sur un composant ; renvoie une ref liée au parent."
:::
