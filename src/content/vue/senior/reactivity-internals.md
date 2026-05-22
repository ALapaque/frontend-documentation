---
title: "Internals de la réactivité"
slug: "reactivity-internals"
framework: "vue"
level: "senior"
order: 1
duration: 20
prerequisites: ["composables"]
updated: 2026-05-22
seoTitle: "Internals de la réactivité Vue — proxies & tracking"
seoDescription: "Comment Vue trace les dépendances : Proxy, effets, et le couple track/trigger."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "zoneless" }
  - { framework: "react", slug: "compiler" }
---

## Proxy : intercepter lecture et écriture

`reactive()` enveloppe l'objet dans un `Proxy`. Toute lecture passe par `get`
(on **track**e la dépendance), toute écriture par `set` (on **trigger**e les
effets qui en dépendent).

```js
function reactive(target) {
  return new Proxy(target, {
    get(obj, key) { track(obj, key); return obj[key]; },
    set(obj, key, value) { obj[key] = value; trigger(obj, key); return true; },
  });
}
```

## L'effet actif

Quand un `computed` ou un `watchEffect` s'exécute, Vue note l'effet « actif ».
Chaque `track` relie la propriété lue à cet effet. Au `trigger`, Vue rejoue
exactement les effets concernés — ni plus, ni moins.

:::cheatsheet
- title: "track(target, key)"
  desc: "Enregistre que l'effet actif dépend de cette propriété."
- title: "trigger(target, key)"
  desc: "Rejoue les effets qui dépendent de la propriété modifiée."
- title: "ref"
  desc: "Un objet avec un accesseur .value qui track/trigger comme un Proxy à une clé."
:::

## Pourquoi ref a besoin de .value

Une primitive ne peut pas être proxifiée (pas d'accès à intercepter). `ref`
contourne ça avec un objet portant un getter/setter `.value` — c'est là que se
fait le track/trigger.

:::callout{type="warn"}
Les pièges de tracking découlent du Proxy : ajouter une clé à un objet non
préparé, remplacer un tableau par index sur du non-réactif, ou déstructurer
(tu lis la valeur **une fois**, le lien est rompu). `toRefs` préserve le lien.
:::

## Code source

`packages/reactivity` (notamment `effect.ts`, `baseHandlers.ts`) est compact et
très lisible. C'est la meilleure façon de comprendre le couple track/trigger et
les subtilités de `shallowReactive`/`markRaw`.
