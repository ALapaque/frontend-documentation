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

Garde le getter **pur** : pas de mutation ni d'appel réseau dedans. Un `computed`
qui produit un effet de bord casse la mise en cache et devient imprévisible.

## watch : réagir à un changement précis

`watch` exécute un effet de bord quand une source change, avec l'ancienne et la
nouvelle valeur. Par défaut il ne se déclenche **pas** au montage : ajoute
`{ immediate: true }` si tu veux aussi réagir à la valeur initiale.

```js
watch(query, (next, prev) => {
  fetchResults(next);
}, { immediate: true });
```

Pour observer une `ref` d'objet ou un `reactive`, passe par un getter
(`() => obj.champ`) ; observer l'objet directement n'est profond que via
`{ deep: true }`, plus coûteux.

## watchEffect : suivi automatique

`watchEffect` s'exécute immédiatement et re-déclenche dès qu'une dépendance
lue à l'intérieur change — sans la déclarer. Il ne donne pas l'ancienne valeur,
et ne suit que les dépendances réellement lues lors de l'exécution courante (un
accès dans une branche `if` non prise n'est pas tracé).

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
