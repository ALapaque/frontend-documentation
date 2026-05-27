---
title: "Transitions"
slug: "transitions"
framework: "vue"
level: "medior"
order: 10
duration: 14
prerequisites: ["template-syntax"]
updated: 2026-05-22
seoTitle: "Vue Transitions & TransitionGroup"
seoDescription: "<Transition> et <TransitionGroup> : animer entrée/sortie et listes avec les classes v-enter/v-leave et FLIP."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "defer-lazy" }
  - { framework: "react", slug: "concurrent-features" }
---

## Transition anime un seul élément qui apparaît ou disparaît

`<Transition>` enveloppe **un** élément (ou composant) conditionnel et applique des
classes CSS aux moments clés de son entrée et de sa sortie. Vue ajoute et retire
six classes selon les phases.

```vue
<template>
  <Transition name="fade">
    <p v-if="show">Bonjour</p>
  </Transition>
</template>

<style>
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .3s ease; }
</style>
```

`*-enter-from` est l'état de départ, `*-enter-active` porte la transition CSS,
`*-enter-to` l'état final ; symétriquement pour `*-leave-*`. Vue retire l'élément
du DOM seulement quand la transition de sortie est terminée.

## Hooks JS pour le contrôle fin

Quand le CSS ne suffit pas (animation pilotée par JS, lib externe), les hooks
d'événement remplacent ou complètent les classes.

```vue
<Transition
  @enter="(el, done) => animate(el, done)"
  @leave="(el, done) => fadeOut(el, done)"
  :css="false"
>
  <Panel v-if="open" />
</Transition>
```

:::callout{type="tip"}
`:css="false"` dit à Vue de ne pas attendre la fin d'une transition CSS et de se
fier uniquement au `done()` des hooks JS. Indispensable avec GSAP ou Motion One
pour éviter une fin de transition prématurée.
:::

## TransitionGroup et le FLIP des listes

Pour une liste (`v-for`), `<TransitionGroup>` anime entrée, sortie **et
déplacement** des éléments réordonnés via la technique FLIP, déclenchée par la
classe `*-move`.

```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">{{ item.label }}</li>
  </TransitionGroup>
</template>

<style>
.list-move { transition: transform .4s ease; }
.list-enter-from, .list-leave-to { opacity: 0; }
.list-enter-active, .list-leave-active { transition: all .4s ease; }
.list-leave-active { position: absolute; }
</style>
```

## Classes manuelles vs Transition

:::compare
::bad
```vue
<script setup>
async function close() {
  el.value.classList.add('closing');
  await new Promise(r => setTimeout(r, 300)); // timer fragile
  show.value = false;
}
</script>
```
::
::good
```vue
<Transition name="fade">
  <p v-if="show">…</p>
</Transition>
<!-- Vue retire le nœud quand la transition de sortie finit réellement -->
```
::
:::

**Pourquoi** : le timer manuel duplique en JS la durée déclarée en CSS — toute désynchronisation coupe l'animation ou laisse l'élément fantôme, et un changement d'état rapide laisse des classes orphelines. `<Transition>` écoute les événements `transitionend`/`animationend` réels du navigateur et ne démonte le nœud qu'à la fin effective, ce qui garde une seule source de vérité sur la durée.

:::callout{type="warn"}
Respecte `prefers-reduced-motion`. Enveloppe tes transitions d'une media query qui
réduit les durées à zéro pour les utilisateurs sensibles au mouvement :
`@media (prefers-reduced-motion: reduce) { .fade-enter-active { transition: none } }`.
:::

### Idée reçue : « TransitionGroup anime le tri tout seul »

Faux : le FLIP ne fonctionne que si Vue peut **identifier chaque élément entre deux
rendus**. Sans `:key` stable et unique (un index de boucle ne l'est pas), Vue
réutilise les nœuds DOM en place et ne détecte aucun déplacement — rien ne bouge.
Et même avec de bonnes clés, l'animation de déplacement n'existe que si tu définis
une classe `*-move` avec une `transition: transform`. Les deux conditions sont
nécessaires : clés stables **et** move-class.

:::cheatsheet
- title: "Six classes"
  desc: "enter-from/active/to et leave-from/active/to pilotent chaque phase."
- title: ":css=\"false\""
  desc: "Délègue le timing aux hooks JS via le callback done()."
- title: "FLIP = key + move"
  desc: "TransitionGroup déplace via *-move et des :key stables uniquement."
- title: "Reduced motion"
  desc: "Coupe les durées sous prefers-reduced-motion: reduce."
:::
