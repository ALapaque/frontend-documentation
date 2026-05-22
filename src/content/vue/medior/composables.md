---
title: "Composables"
slug: "composables"
framework: "vue"
level: "medior"
order: 2
duration: 16
prerequisites: ["composition-vs-options"]
updated: 2026-05-22
seoTitle: "Composables Vue — patterns et conventions"
seoDescription: "Écrire des composables réutilisables : conventions de nommage, état, et nettoyage."
ogVariant: "gold"
related:
  - { framework: "react", slug: "hooks-rules" }
  - { framework: "angular", slug: "signals-rxjs-interop" }
---

## Un composable, c'est de la logique réactive réutilisable

Une fonction `useX` qui encapsule de l'état réactif et sa logique, et retourne
ce que le composant consommera.

```js
export function useMouse() {
  const x = ref(0);
  const y = ref(0);
  function update(e) { x.value = e.pageX; y.value = e.pageY; }
  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));
  return { x, y };
}
```

## La convention : retourner des refs

Retourne des `ref` (ou un objet de refs), pas des valeurs déballées — sinon le
consommateur perd la réactivité.

:::compare
::bad
```js
function useCount() {
  const count = ref(0);
  return { count: count.value }; // valeur figée, non réactive
}
```
::
::good
```js
function useCount() {
  const count = ref(0);
  return { count }; // ref → reste réactive chez l'appelant
}
```
::
:::

**Pourquoi** : `count.value` lit la primitive contenue à l'instant T et la copie hors de la `ref` — l'appelant reçoit un nombre figé, sans aucun lien avec les mutations futures. Retourner la `ref` elle-même transmet le conteneur réactif : Vue continue de pister les lectures de `.value` et de redéclencher les effets quand elle change.

:::cheatsheet
- title: "Nomme useX"
  desc: "Convention reconnue par l'écosystème et les outils."
- title: "Nettoie tes effets"
  desc: "onUnmounted retire listeners/timers ouverts par le composable."
- title: "Accepte des refs en entrée"
  desc: "Utilise toValue/unref pour accepter aussi bien valeurs que refs."
:::

## Accepter des entrées flexibles

Un bon composable accepte aussi bien une valeur brute qu'une `ref` ou un getter.
La convention 3.x : typer l'argument `MaybeRefOrGetter<T>` et le lire via
`toValue()`, qui déballe ref *et* getter de façon uniforme.

```js
import { toValue, watchEffect } from 'vue';
export function useFetch(url /* MaybeRefOrGetter<string> */) {
  const data = ref(null);
  watchEffect(() => { fetch(toValue(url)).then(r => data.value = r); });
  return { data };
}
// useFetch(() => `/api/${id.value}`) refetch quand id change
```

:::callout{type="warn"}
État défini **hors** de la fonction (au niveau module) = singleton partagé. En
SSR, ce singleton fuit entre les requêtes de différents utilisateurs. Garde
l'état réactif **dans** le composable, sauf store global volontaire (Pinia).
:::

:::callout{type="tip"}
VueUse est une bibliothèque de composables prêts à l'emploi (`useFetch`,
`useEventListener`, `useLocalStorage`). Étudie son code source : c'est un manuel
de bonnes pratiques de composables.
:::
