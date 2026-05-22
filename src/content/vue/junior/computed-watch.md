---
title: "computed & watch"
slug: "computed-watch"
framework: "vue"
level: "junior"
order: 3
duration: 13
prerequisites: ["reactivity-basics"]
updated: 2026-05-22
seoTitle: "computed vs watch vs watchEffect — Guide Junior Vue"
seoDescription: "Quand dériver une valeur (computed) et quand réagir à un changement (watch/watchEffect)."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "memo-callback" }
---

## computed : une valeur dérivée

`computed` calcule une valeur à partir d'autres, et la **met en cache** : elle
ne se recalcule que si une dépendance change.

```js
const first = ref('Ada');
const last = ref('Lovelace');
const fullName = computed(() => `${first.value} ${last.value}`);
```

## watch : réagir à un changement précis

`watch` exécute un effet de bord quand une source change, avec l'ancienne et la
nouvelle valeur.

```js
watch(query, (next, prev) => {
  fetchResults(next);
});
```

## watchEffect : suivi automatique

`watchEffect` s'exécute immédiatement et re-déclenche dès qu'une dépendance
lue à l'intérieur change — sans la déclarer.

:::cheatsheet
- title: "computed"
  desc: "Dérive une valeur, mise en cache. Pour ce que tu affiches."
- title: "watch(source, cb)"
  desc: "Réagit à une source explicite ; donne old/new. Pour les effets de bord."
- title: "watchEffect(cb)"
  desc: "Suit automatiquement ses dépendances, s'exécute immédiatement."
:::

:::callout{type="warn"}
N'utilise pas `watch` pour calculer un état dérivé que tu pourrais exposer en
`computed`. Le `computed` est mis en cache, déclaratif et sans effet de bord —
toujours préférable quand il s'agit juste de dériver.
:::
