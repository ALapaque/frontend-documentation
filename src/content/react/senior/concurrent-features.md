---
title: "Concurrent features"
slug: "concurrent-features"
framework: "react"
level: "senior"
order: 2
duration: 20
prerequisites: ["rsc"]
updated: 2026-05-22
seoTitle: "React concurrent — transitions, useOptimistic"
seoDescription: "Transitions, useDeferredValue et useOptimistic : prioriser le rendu pour une UI qui reste réactive."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "zoneless" }
  - { framework: "vue", slug: "perf-strategy" }
---

## Tous les rendus ne se valent pas

Le rendu concurrent permet à React d'**interrompre** et de **prioriser**. Une
frappe au clavier est urgente ; le re-filtrage d'une grosse liste peut attendre.
Tu marques l'un comme non urgent, React garde l'UI fluide.

## useTransition

```tsx
const [isPending, startTransition] = useTransition();

function onChange(e) {
  setQuery(e.target.value);           // urgent : l'input répond
  startTransition(() => setResults(filter(e.target.value))); // peut être différé
}
```

## useDeferredValue

Même idée, côté consommateur : afficher une version « en retard » d'une valeur
le temps que le coûteux rattrape.

```tsx
const deferredQuery = useDeferredValue(query);
const list = useMemo(() => filter(deferredQuery), [deferredQuery]);
```

## useOptimistic

Afficher immédiatement le résultat attendu d'une mutation, avant la confirmation
serveur.

```tsx
const [optimistic, addOptimistic] = useOptimistic(messages, (state, msg) => [
  ...state,
  { ...msg, pending: true },
]);
```

:::cheatsheet
- title: "useTransition"
  desc: "Marque une mise à jour comme non urgente ; expose isPending."
- title: "useDeferredValue"
  desc: "Diffère une valeur dérivée coûteuse sans bloquer l'urgent."
- title: "useOptimistic"
  desc: "État optimiste pendant qu'une action asynchrone se résout."
:::

:::callout{type="warn"}
Une transition n'accélère rien : elle **réordonne**. Si le travail différé est
intrinsèquement lent, optimise-le (virtualisation, mémoïsation). Les transitions
masquent la latence, elles ne la suppriment pas.
:::
