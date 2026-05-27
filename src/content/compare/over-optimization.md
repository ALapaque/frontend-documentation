---
title: "Sur-optimisation"
lead: "Mémoïser à l'aveugle coûte plus que ça ne rapporte. Mesure d'abord."
updated: 2026-05-22
seoTitle: "Sur-optimisation — Angular vs React vs Vue"
seoDescription: "memo/useMemo, OnPush, shallowRef au bon endroit : éviter la mémoïsation prématurée et mesurer avant d'optimiser."
related:
  - { framework: "angular", slug: "change-detection" }
  - { framework: "react", slug: "memo-callback" }
  - { framework: "vue", slug: "perf-strategy" }
---

## Optimiser par réflexe, sans mesurer

`useMemo` autour d'une addition, `useCallback` sur chaque handler, `React.memo`
sur tous les composants « au cas où ». Chaque mémoïsation a un coût : mémoire
pour le cache, comparaison des dépendances à chaque rendu, lisibilité en moins.
Pour un calcul trivial, ce coût *dépasse* le gain — tu paies la comparaison
pour économiser une addition. La mémoïsation prématurée est une optimisation
négative.

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Outil mal employé | `OnPush` sans immutabilité | `useMemo`/`useCallback`/`memo` partout | `shallowRef`/`v-memo` à l'aveugle |
| Coût caché | invalidation manquée → UI figée | comparaison de deps + cache | bug de réactivité si shallow mal placé |
| Justifié quand | grosse sous-arborescence | calcul lourd / égalité référentielle requise | grande liste / valeur coûteuse |
| Réduit par | signals (réactivité fine) | React Compiler (auto-mémo) | réactivité fine native |

## Ce qui rend la mémo souvent inutile

La réactivité fine d'Angular (signals) et de Vue ne recalcule que ce qui dépend
réellement de ce qui a changé : pas besoin de mémoïser à la main la majorité du
temps. Côté React, le **React Compiler** mémoïse automatiquement composants et
valeurs, rendant `useMemo`/`useCallback`/`memo` manuels largement obsolètes.
Écrire ces appels à la main devient l'exception, pas la règle.

:::callout{type="info"}
La mémoïsation se justifie dans trois cas : un calcul **réellement lourd**, une
**identité référentielle** requise par une dépendance (clé de `useEffect`, prop
d'un enfant `memo`), ou une **grande liste** dont le re-render mesuré pose
problème. Hors de ces cas, mesure avant d'ajouter quoi que ce soit.
:::

## Trivial vs justifié

:::tri{title="Quand mémoïser, quand s'abstenir"}
::angular
```ts
import { Component, signal, computed } from '@angular/core';

@Component({ selector: 'app-perf', template: `{{ doubled() }} {{ heavy() }}` })
export class Perf {
  n = signal(2);
  rows = signal<number[]>([]);

  // INUTILE de "mémoïser" : un computed sur une multiplication est gratuit,
  // mais ne crée pas de cache custom autour. computed suffit, point.
  doubled = computed(() => this.n() * 2);

  // JUSTIFIÉ : calcul réellement coûteux, recalculé seulement si rows change.
  heavy = computed(() =>
    this.rows().reduce((acc, r) => acc + expensiveScore(r), 0),
  );
}
declare function expensiveScore(r: number): number;
```
::
::react
```tsx
import { useMemo, useState } from 'react';

export function Perf({ rows }: { rows: number[] }) {
  const [n, setN] = useState(2);

  // INUTILE : useMemo autour de n*2 coûte plus que le calcul lui-même.
  // const doubled = useMemo(() => n * 2, [n]);  // ne fais pas ça
  const doubled = n * 2; // laisse-le nu

  // JUSTIFIÉ : reduce coûteux sur une grande liste, mesuré au Profiler.
  const score = useMemo(
    () => rows.reduce((acc, r) => acc + expensiveScore(r), 0),
    [rows],
  );

  return <span onClick={() => setN(n + 1)}>{doubled} {score}</span>;
}
declare function expensiveScore(r: number): number;
```
::
::vue
```vue
<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue';

const props = defineProps<{ rows: number[] }>();
const n = ref(2);

// INUTILE : un computed sur n*2 est trivial — mais surtout n'utilise pas
// shallowRef "pour optimiser" sur une valeur dont tu mutes l'intérieur :
// tu casserais la réactivité. shallowRef = grosse structure immuable.
const doubled = computed(() => n.value * 2);

// JUSTIFIÉ : computed sur calcul lourd, recalcul paresseux et mémoïsé.
const score = computed(() =>
  props.rows.reduce((acc, r) => acc + expensiveScore(r), 0),
);
declare function expensiveScore(r: number): number;
</script>

<template>{{ doubled }} {{ score }}</template>
```
::
:::

## Les pièges propres à chaque framework

`OnPush` mal posé fige l'UI quand on mute un objet au lieu d'en créer un
nouveau — il exige l'immutabilité. `shallowRef` casse la réactivité profonde si
on en mute l'intérieur. `React.memo` est inutile si on passe des props
non-stables (objets/fonctions recréés) : la comparaison échoue toujours. Chaque
optimisation a sa condition de validité ; l'appliquer sans la comprendre crée
un bug, pas un gain.

## Verdict

**Profile, puis optimise le chemin chaud prouvé.** N'ajoute pas `useMemo`,
`useCallback`, `memo`, `OnPush` ou `shallowRef` par réflexe : chacun a un coût
et des conditions. La réactivité fine (Angular, Vue) et le React Compiler
réduisent drastiquement le besoin de mémoïsation manuelle. Mesure au Profiler
ou aux DevTools, identifie le vrai goulot, et n'optimise que là — le reste,
laisse-le nu et lisible.
