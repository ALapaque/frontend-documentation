---
title: "State : les bases"
slug: "state-basics"
framework: "react"
level: "junior"
order: 2
duration: 12
prerequisites: ["jsx-basics"]
updated: 2026-05-22
seoTitle: "useState & useReducer — Guide Junior React"
seoDescription: "Gérer l'état local avec useState et useReducer : ce qui déclenche un re-render et pourquoi."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "vue", slug: "reactivity-basics" }
---

## useState : une valeur qui survit aux re-renders

Une variable locale est réinitialisée à chaque rendu. `useState` garde la valeur
**entre** les rendus et déclenche un re-render quand elle change.

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Mettre à jour à partir de l'ancien état

Si la nouvelle valeur dépend de l'ancienne, passe une **fonction** à `setCount`.
Sinon, plusieurs mises à jour dans le même tick s'écrasent.

:::compare
::bad
```tsx
setCount(count + 1);
setCount(count + 1); // les deux lisent le même `count` → +1 au total
```
::
::good
```tsx
setCount((c) => c + 1);
setCount((c) => c + 1); // +2
```
::
:::

**Pourquoi** : dans un même cycle, les deux appels lisent la **même** valeur figée de `count` (closure du rendu courant), donc le second écrase le premier — résultat +1. La forme fonction `c => c + 1` reçoit la valeur la plus à jour de la file de mises à jour, d'où +2.

## useReducer : quand l'état a une logique

Dès que les transitions deviennent nombreuses, `useReducer` centralise la
logique dans une fonction pure.

```tsx
const [state, dispatch] = useReducer(reducer, { count: 0 });

function reducer(s: State, action: Action): State {
  switch (action.type) {
    case 'inc': return { count: s.count + 1 };
    case 'reset': return { count: 0 };
  }
}
```

:::callout{type="tip"}
L'état React est **immutable** : ne mute jamais un objet ou un tableau en place.
Crée une nouvelle référence (`{ ...obj }`, `[...arr]`), sinon React ne détecte
pas le changement.
:::
