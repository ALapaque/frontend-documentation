---
title: "Closures périmées"
lead: "La valeur capturée d'hier qui sabote le callback d'aujourd'hui."
updated: 2026-05-22
seoTitle: "Closures périmées — Angular vs React vs Vue"
seoDescription: "Valeurs capturées obsolètes : tableaux de deps, useEffectEvent, lecture de signaux/refs à jour. Éviter les bugs de closure."
related:
  - { framework: "react", slug: "hooks-rules" }
  - { framework: "angular", slug: "signals" }
  - { framework: "vue", slug: "reactivity-deep" }
---

## La capture qui se fige

Une closure capture la valeur d'une variable à l'instant de sa création. En
React, un `setInterval` posé dans un `useEffect([])` capture le `count` du
premier rendu : il affichera toujours `0 + 1`, jamais la valeur courante. Le
composant rerend, une *nouvelle* closure existe avec le bon `count`, mais
l'intervalle exécute encore l'ancienne. C'est le bug de closure périmée :
le callback travaille sur un instantané obsolète.

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Source du piège | rare (signals lisent la valeur courante) | deps figées dans `useEffect`/`useCallback` | rare (refs lisent `.value` courant) |
| Lecture toujours fraîche | `count()` (signal) | functional update / `ref` / `useEffectEvent` | `count.value` (ref) |
| Outil dédié | — | `useEffectEvent` | `toValue` pour normaliser refs/getters |
| Verdict implicite | la réactivité fine évite le piège | discipline des deps requise | la réactivité fine évite le piège |

## Pourquoi les signaux esquivent le problème

Un signal Angular et un ref Vue ne capturent pas une *valeur* mais une
*référence à un conteneur*. `count()` ou `count.value` relit le contenu actuel
à chaque appel, même dans une closure créée bien plus tôt. React capture la
variable elle-même : d'où le besoin de mises à jour fonctionnelles
(`setCount(c => c + 1)`), de `ref` pour les valeurs « toujours fraîches », ou
de `useEffectEvent` pour lire la dernière valeur sans la mettre en dépendance.

:::callout{type="info"}
`useEffectEvent` extrait la lecture d'une valeur changeante hors du tableau de
deps : l'effet ne se réexécute pas quand cette valeur change, mais l'appel lit
toujours la version la plus récente. Idéal pour un handler dans un `setInterval`
ou un listener.
:::

## Lire la dernière valeur dans un intervalle

:::tri{title="Un compteur qui lit la valeur courante"}
::angular
```ts
import { Component, signal, DestroyRef, inject } from '@angular/core';

@Component({ selector: 'app-counter', template: `{{ count() }}` })
export class Counter {
  count = signal(0);

  constructor() {
    const id = setInterval(() => {
      // count() relit TOUJOURS la valeur courante : pas de capture figée.
      this.count.set(this.count() + 1);
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
```
::
::react
```tsx
import { useEffect, useState, experimental_useEffectEvent as useEffectEvent } from 'react';

export function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0);

  // useEffectEvent lit le dernier `step` sans le mettre en dépendance.
  const onTick = useEffectEvent(() => setCount((c) => c + step));

  useEffect(() => {
    // MAUVAIS : setCount(count + step) capturerait le count du 1er rendu.
    // BON : functional update + useEffectEvent → toujours à jour.
    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
  }, []); // deps vides OK : aucune valeur figée n'est lue directement

  return <>{count}</>;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue';

const props = defineProps<{ step: MaybeRefOrGetter<number> }>();
const count = ref(0);

onMounted(() => {
  const id = setInterval(() => {
    // count.value et toValue(props.step) relisent la valeur courante :
    // aucune closure figée, le proxy réactif suit.
    count.value += toValue(props.step);
  }, 1000);
  onUnmounted(() => clearInterval(id));
});
</script>

<template>{{ count }}</template>
```
::
:::

## Le réflexe React

Quand tu vois un `useEffect`/`useCallback` avec deps vides mais qui lit un
state ou une prop, suspecte la closure périmée. Trois remèdes : mise à jour
fonctionnelle (`setX(prev => …)`), un `ref` mutable pour la « dernière valeur »,
ou `useEffectEvent` pour les handlers. Ne mens jamais au tableau de deps pour
faire taire le linter.

## Verdict

La closure périmée est avant tout un problème **React**, parce que React
capture des valeurs, pas des conteneurs réactifs. La discipline : functional
updates, `ref`, et `useEffectEvent` — et respecte le tableau de deps au lieu de
le tronquer. Angular (signals) et Vue (refs) relisent par construction la
valeur courante : le piège ne se présente quasiment jamais. **Lis toujours la
dernière valeur, ne capture jamais un instantané.**
