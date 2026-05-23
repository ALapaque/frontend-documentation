---
title: "État dérivé"
lead: "Stocker ce qu'on peut calculer, c'est programmer ses propres bugs de désynchronisation."
updated: 2026-05-22
seoTitle: "État dérivé — Angular vs React vs Vue"
seoDescription: "Single source of truth : dériver avec computed/useMemo au lieu de dupliquer l'état et de le resynchroniser à la main."
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "state-architecture" }
  - { framework: "vue", slug: "computed-watch" }
---

## Le péché de la copie

Vous avez `items` en état. Vous voulez `total`, `selectedCount`, `isEmpty`. La
tentation : créer un deuxième état pour chacun et le mettre à jour à chaque
mutation de `items`. Le jour où une mutation oublie de propager — un `push`
ailleurs, un reset partiel — les deux états divergent. Le `total` affiche 5, la
liste en montre 4. C'est le bug le plus banal du frontend : **deux sources de
vérité pour la même information**.

| Symptôme | Angular | React | Vue |
| --- | --- | --- | --- |
| Anti-pattern | second `signal` + `effect` de sync | second `useState` + `useEffect` | second `ref` + `watch` |
| Risque | désynchro à la moindre mutation oubliée | rendu en trop + désynchro | désynchro silencieuse |
| Bonne réponse | `computed` | `useMemo` (ou calcul inline) | `computed` |
| Coût | recalcul paresseux mémoïsé | mémoïsé sur deps | recalcul paresseux mémoïsé |

## Une seule source de vérité

Si une valeur **peut se calculer** à partir d'une autre, elle ne doit pas être
stockée. `computed`/`useMemo` recalcule à la demande, met en cache le résultat,
et reste mathématiquement impossible à désynchroniser : il n'existe pas de
chemin de code qui modifie `total` sans passer par `items`.

:::callout{type="warn"}
Le `useEffect`/`watch` qui « met à jour le state dérivé » est un drapeau rouge.
Il ajoute un rendu, introduit une fenêtre où l'UI affiche l'ancienne valeur
dérivée à côté de la nouvelle source, et casse dès qu'une mutation contourne
l'effet. Remplacez-le par une dérivation.
:::

## Dupliquer vs dériver

:::tri{title="Total d'un panier : copie vs dérivation"}
::angular
```ts
import { Component, signal, computed } from '@angular/core';

@Component({ selector: 'app-cart', template: `{{ total() }} €` })
export class Cart {
  items = signal([{ price: 10 }, { price: 5 }]);

  // MAUVAIS : second état + effect qui le resynchronise
  //   total = signal(0);
  //   constructor() {
  //     effect(() => this.total.set(
  //       this.items().reduce((s, i) => s + i.price, 0)));
  //   }

  // BON : dérivé, impossible à désynchroniser
  total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
}
```
::
::react
```tsx
import { useMemo, useState } from 'react';

export function Cart() {
  const [items] = useState([{ price: 10 }, { price: 5 }]);

  // MAUVAIS : state dupliqué resynchronisé par un effet
  //   const [total, setTotal] = useState(0);
  //   useEffect(() => {
  //     setTotal(items.reduce((s, i) => s + i.price, 0));
  //   }, [items]); // rendu en trop + désynchro possible

  // BON : dérivation pendant le rendu
  const total = useMemo(
    () => items.reduce((s, i) => s + i.price, 0),
    [items],
  );

  return <span>{total} €</span>;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const items = ref([{ price: 10 }, { price: 5 }]);

// MAUVAIS : ref dupliqué + watch de synchro
//   const total = ref(0);
//   watch(items, () => {
//     total.value = items.value.reduce((s, i) => s + i.price, 0);
//   }, { immediate: true, deep: true });

// BON : computed, source unique de vérité
const total = computed(() =>
  items.value.reduce((s, i) => s + i.price, 0),
);
</script>

<template>{{ total }} €</template>
```
::
:::

## Quand stocker malgré tout

Une seule exception : un état dérivé que l'utilisateur peut ensuite **éditer**
indépendamment (préremplir un champ depuis une prop, puis le laisser diverger).
Là, vous stockez délibérément — mais sachez que vous *acceptez* la divergence,
ce n'est pas un dérivé. Le reste se calcule.

## Verdict

**Single source of truth.** Si vous pouvez calculer une valeur, calculez-la
avec `computed`/`useMemo` ; ne la stockez jamais en parallèle. L'état dupliqué
plus l'effet de synchro est une machine à fabriquer des bugs de désynchro et
des rendus superflus. Dérivez par défaut, ne stockez qu'un état réellement
*indépendant*.
