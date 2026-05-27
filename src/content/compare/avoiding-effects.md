---
title: "Quand éviter les effets"
lead: "L'effet de bord réactif est le dernier recours, pas le premier réflexe."
updated: 2026-05-22
seoTitle: "Éviter les effects — Angular vs React vs Vue"
seoDescription: "You Might Not Need an Effect : dériver avec computed/useMemo, réagir dans un handler, réserver l'effet à la seule synchro avec l'extérieur."
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "effects-basics" }
  - { framework: "vue", slug: "computed-watch" }
---

## L'effet n'est pas un outil de calcul

Un effet (`effect`, `useEffect`, `watch`) sert à **synchroniser avec un système
extérieur** : le DOM impératif, une API tierce, le stockage, un timer. Tout le
reste — dériver une valeur, réagir à un clic, propager un changement — a une
réponse plus directe et plus sûre. Utiliser un effet pour ces cas crée un
deuxième rendu, des états transitoires incohérents, et des chaînes d'effets
impossibles à suivre.

| Cas | Mauvais réflexe | Bonne réponse |
| --- | --- | --- |
| Dériver une valeur | effet qui `set` un autre state | `computed` / `useMemo` |
| Réagir à un événement utilisateur | effet déclenché par un flag | logique dans le handler |
| Enchaîner des states | effet → set → effet → set | un seul calcul dérivé |
| Synchroniser l'extérieur | (légitime) | effet avec nettoyage |

## Les trois anti-usages

**(a) Dériver dans un effet.** `fullName` calculé à partir de `first` et `last`
n'a pas besoin d'un effet qui écrit dans un troisième état : c'est un `computed`.
**(b) Réagir à un événement dans un effet.** Si l'utilisateur clique « acheter »,
la requête part *du handler*, pas d'un effet qui surveille un booléen.
**(c) Enchaîner des effets qui posent des states.** Chaque maillon ajoute un
rendu et un point de désynchro ; remplace la chaîne par une valeur dérivée
unique.

:::callout{type="info"}
La règle « You Might Not Need an Effect » de React vaut pour les trois
frameworks. Avant d'écrire un effet, pose-toi la question : *est-ce une synchro
avec un système externe ?* Si non, c'est un `computed`/`useMemo` ou du code
dans un gestionnaire d'événement.
:::

## Dériver, pas observer

:::tri{title="Filtrer une liste : effet vs valeur dérivée"}
::angular
```ts
import { Component, signal, computed } from '@angular/core';

@Component({ selector: 'app-list', template: `{{ visible().length }}` })
export class List {
  items = signal<string[]>([]);
  query = signal('');

  // MAUVAIS : un effect qui recopie dans un autre signal
  //   filtered = signal<string[]>([]);
  //   constructor() {
  //     effect(() => this.filtered.set(
  //       this.items().filter((i) => i.includes(this.query()))));
  //   }

  // BON : valeur dérivée, recalculée à la demande, jamais désynchronisée
  visible = computed(() =>
    this.items().filter((i) => i.includes(this.query())),
  );
}
```
::
::react
```tsx
import { useMemo, useState } from 'react';

export function List({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');

  // MAUVAIS : useEffect + setState recopie un état dérivé
  //   const [visible, setVisible] = useState(items);
  //   useEffect(() => {
  //     setVisible(items.filter((i) => i.includes(query)));
  //   }, [items, query]); // rendu en trop + risque de désynchro

  // BON : dérivation pure pendant le rendu
  const visible = useMemo(
    () => items.filter((i) => i.includes(query)),
    [items, query],
  );

  return <span>{visible.length}</span>;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{ items: string[] }>();
const query = ref('');

// MAUVAIS : un watch qui pousse dans un autre ref
//   const visible = ref(props.items);
//   watch([() => props.items, query], () => {
//     visible.value = props.items.filter((i) => i.includes(query.value));
//   });

// BON : computed, source unique de vérité
const visible = computed(() =>
  props.items.filter((i) => i.includes(query.value)),
);
</script>

<template>{{ visible.length }}</template>
```
::
:::

## Le seul usage légitime

Reste l'effet qui parle au monde extérieur : abonner un `IntersectionObserver`,
synchroniser le titre du document, brancher une lib non réactive. Là, l'effet
est le bon outil — avec son nettoyage. Tout le reste se dérive ou se gère dans
un handler.

## Verdict

Avant d'écrire un effet, demande-toi : *« Est-ce que je calcule quelque
chose, ou est-ce que je réagis à un clic ? »* Si oui, ce n'est pas un effet —
c'est un `computed`/`useMemo` ou du code dans le gestionnaire. **L'effet est
réservé à la synchronisation avec un système externe**, et il a toujours un
nettoyage. Réserve-le, et la moitié de tes bugs de rendu disparaissent.
