---
title: "Composants & props"
slug: "components-props"
framework: "vue"
level: "junior"
order: 4
duration: 12
prerequisites: ["template-syntax", "reactivity-basics"]
updated: 2026-05-22
seoTitle: "Composants & props — vue"
seoDescription: "defineProps, defineEmits et slots : comment un composant Vue 3 reçoit des données en descente et fait remonter des événements, et pourquoi on ne mute jamais une prop."
ogVariant: "sage"
related:
  - framework: "react"
    slug: "lifting-state"
  - framework: "angular"
    slug: "data-binding"
---

Un composant Vue est une unité réutilisable : un bout de template, une logique, un état. Pour communiquer, deux canaux suffisent. Les données descendent par les props. Les événements remontent par les emits. C'est un sens unique dans chaque direction.

## Recevoir des données : defineProps

Un parent passe des valeurs à un enfant via des attributs. L'enfant les déclare avec `defineProps`. Pas d'import : c'est un macro de compilation disponible dans `<script setup>`.

```vue
<!-- Enfant.vue -->
<script setup>
const props = defineProps({
  label: { type: String, required: true },
  count: { type: Number, default: 0 }
})
</script>

<template>
  <button>{{ label }} ({{ count }})</button>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import Enfant from './Enfant.vue'
const total = 12
</script>

<template>
  <Enfant label="Panier" :count="total" />
</template>
```

Le `:` devant `count` indique une liaison dynamique : la valeur est une expression JavaScript (`total`), pas la chaîne `"total"`. Sans `:`, tout attribut est une chaîne littérale.

## Remonter un événement : defineEmits

L'enfant n'a pas le droit de modifier ce que le parent lui envoie. Pour signaler une action, il émet un événement que le parent écoute.

```vue
<!-- Enfant.vue -->
<script setup>
const emit = defineEmits(['increment'])
</script>

<template>
  <button @click="emit('increment', 1)">+1</button>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue'
import Enfant from './Enfant.vue'
const total = ref(0)
</script>

<template>
  <Enfant :count="total" @increment="total += $event" />
</template>
```

L'enfant émet, le parent décide quoi faire. C'est le parent qui possède l'état (`total`) et qui le modifie. L'enfant reste ignorant de la conséquence.

## Ne jamais muter une prop

La tentation classique : modifier directement la prop reçue. Vue émet un avertissement, et le code casse de manière silencieuse.

:::compare
::bad
```vue
<script setup>
const props = defineProps(['count'])
function add() {
  props.count++ // [Vue warn] Avoid mutating a prop
}
</script>
```
::
::good
```vue
<script setup>
const props = defineProps(['count'])
const emit = defineEmits(['update'])
function add() {
  emit('update', props.count + 1)
}
</script>
```
::
:::

**Pourquoi** : les props sont un flux unidirectionnel (one-way). À chaque rendu, le parent réinjecte la valeur dans l'enfant ; l'objet `props` est rendu en lecture seule (readonly) par un Proxy. Si l'enfant mutait sa copie, le prochain rendu du parent l'écraserait, produisant un état incohérent et impossible à tracer. En remontant l'intention via un emit, on garde une seule source de vérité : le parent. Ce contrat rend le flux de données prévisible et débogable.

## Slots : injecter du contenu

Les props passent des données ; les slots passent du markup. Le parent fournit le contenu, l'enfant décide où le placer avec `<slot>`.

```vue
<!-- Carte.vue -->
<template>
  <article class="carte">
    <header><slot name="titre">Sans titre</slot></header>
    <div class="corps"><slot /></div>
  </article>
</template>
```

```vue
<!-- Parent.vue -->
<template>
  <Carte>
    <template #titre><h2>Facture</h2></template>
    <p>Contenu libre injecté dans le slot par défaut.</p>
  </Carte>
</template>
```

Le slot par défaut (`<slot />`) reçoit tout contenu non nommé. Un slot nommé (`<slot name="titre">`) cible une zone précise ; le parent y répond avec `<template #titre>`. Le texte entre les balises `<slot>` sert de contenu de repli quand le parent ne fournit rien.

:::callout{type="tip"}
Choisis : une prop pour une donnée (texte, nombre, objet), un slot pour du contenu visuel composé, un emit pour une action. Mélanger les trois rend l'API du composant illisible.
:::

:::cheatsheet
- title: "defineProps"
  desc: "Déclare les entrées descendantes, typées et avec valeurs par défaut."
- title: "defineEmits"
  desc: "Déclare les événements remontants ; émet avec emit('nom', payload)."
- title: ":prop vs prop"
  desc: ":count lie une expression JS, count='x' passe la chaîne littérale."
- title: "slot / #nom"
  desc: "Injecte du markup ; slot par défaut + slots nommés avec contenu de repli."
:::
