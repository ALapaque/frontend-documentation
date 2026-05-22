---
title: "Lifecycle"
slug: "lifecycle"
framework: "vue"
level: "junior"
order: 5
duration: 11
prerequisites: ["reactivity-basics", "components-props"]
updated: 2026-05-22
seoTitle: "Lifecycle — vue"
seoDescription: "Les hooks de cycle de vie d'un composant Vue 3 : setup, onBeforeMount, onMounted, onUpdated, onUnmounted, et la règle d'or du nettoyage des ressources."
ogVariant: "sage"
related:
  - framework: "react"
    slug: "effects-basics"
  - framework: "angular"
    slug: "lifecycle"
---

Un composant naît, vit, puis meurt. Il est créé, inséré dans le DOM, mis à jour quand son état change, puis retiré. Vue expose des points d'accroche (hooks) pour exécuter du code à chacune de ces étapes.

## La timeline d'un composant

Imagine un acteur : il se prépare en coulisses (setup), entre en scène (mount), joue et improvise selon le public (update), puis quitte la scène (unmount). Chaque transition a son hook.

```vue
<script setup>
import { onBeforeMount, onMounted, onUpdated, onUnmounted } from 'vue'

console.log('1. setup — le code s\'exécute en premier')

onBeforeMount(() => console.log('2. avant insertion dans le DOM'))
onMounted(() => console.log('3. inséré dans le DOM, refs disponibles'))
onUpdated(() => console.log('4. re-rendu après changement d\'état'))
onUnmounted(() => console.log('5. retiré du DOM'))
</script>
```

Le corps de `<script setup>` est lui-même la phase d'initialisation. Il tourne avant que le moindre élément n'existe dans la page : pas encore de DOM, pas encore de refs de template.

## setup s'exécute avant tout

Dans l'API Options, le hook `created` était le premier point d'entrée. En Composition API, le code de `setup` (donc le corps de `<script setup>`) joue ce rôle et s'exécute encore plus tôt.

```vue
<script setup>
import { ref } from 'vue'
// Ici : équivalent de beforeCreate + created réunis.
// L'état réactif existe, mais le DOM n'existe pas encore.
const titre = ref('Chargement...')
// document.querySelector(...) retournerait null à ce stade.
</script>
```

Conséquence pratique : on initialise l'état dans le corps du script, mais tout accès au DOM rendu (mesurer une largeur, attacher une lib externe) attend `onMounted`.

## onMounted : le DOM est prêt

C'est le hook le plus utilisé. Le composant est dans la page, les `ref` de template pointent sur de vrais éléments.

```vue
<script setup>
import { useTemplateRef, onMounted } from 'vue'

const champ = useTemplateRef('champ')

onMounted(() => {
  champ.value.focus() // l'élément existe enfin
})
</script>

<template>
  <input ref="champ" />
</template>
```

C'est aussi le bon endroit pour lancer un appel réseau, démarrer un timer, ou s'abonner à un évènement global.

:::callout{type="tip"}
`useTemplateRef('champ')` (Vue 3.5+) lie la ref au `ref="champ"` du template par son nom : c'est l'API recommandée, plus claire que l'ancien `const champ = ref(null)` qui reposait sur une correspondance de variable implicite. La ref reste `null` jusqu'à `onMounted`.
:::

## onUnmounted : nettoyer ses ressources

Tout ce qu'on ouvre dans `onMounted` doit être fermé dans `onUnmounted`. C'est la règle d'or : un timer, un listener, un abonnement WebSocket non nettoyés survivent au composant et provoquent des fuites mémoire.

:::callout{type="warn"}
Un `setInterval` lancé sans `clearInterval` continue de tourner après que le composant a disparu. Il référence des variables de la closure, qui ne peuvent donc jamais être collectées. C'est la fuite mémoire la plus fréquente en débutant.
:::

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'

let id
function onResize() { /* ... */ }

onMounted(() => {
  id = setInterval(() => console.log('tick'), 1000)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  clearInterval(id)
  window.removeEventListener('resize', onResize)
})
</script>
```

La symétrie est volontaire : ce qu'on monte, on le démonte ; ce qu'on abonne, on le désabonne. À chaque ouverture dans `onMounted` correspond une fermeture dans `onUnmounted`.

## onUpdated : rarement utile

Ce hook se déclenche après chaque re-rendu provoqué par un changement d'état réactif. Il sert à lire le DOM après mise à jour. Attention : ne jamais y modifier de l'état réactif, sous peine de boucle de rendu infinie.

:::callout{type="tip"}
Avant d'atteindre `onUpdated`, demande-toi si un `watch` ou un `computed` ne ferait pas le travail plus proprement. `onUpdated` réagit à tout re-rendu, sans savoir lequel ; un `watch` cible une donnée précise.
:::

:::cheatsheet
- title: "corps de script setup"
  desc: "S'exécute en premier ; remplace beforeCreate/created. Pas de DOM."
- title: "onBeforeMount"
  desc: "Juste avant l'insertion dans le DOM."
- title: "onMounted"
  desc: "DOM prêt, refs disponibles : focus, fetch, libs externes."
- title: "onUpdated"
  desc: "Après un re-rendu. Ne jamais y muter l'état réactif."
- title: "onUnmounted"
  desc: "Nettoyage : clearInterval, removeEventListener, unsubscribe."
:::
