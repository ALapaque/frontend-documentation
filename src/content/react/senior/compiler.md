---
title: "React Compiler"
slug: "compiler"
framework: "react"
level: "senior"
order: 3
duration: 18
prerequisites: ["memo-callback"]
updated: 2026-05-22
seoTitle: "React Compiler — ce qu'il optimise vraiment"
seoDescription: "Le React Compiler explique : mémoïsation automatique, ce qu'il faut encore écrire, et ses limites."
ogVariant: "crimson"
related:
  - { framework: "vue", slug: "vapor-mode" }
  - { framework: "angular", slug: "change-detection" }
---

## La fin du useMemo manuel

Le React Compiler analyse ton code au build et insère la mémoïsation à ta place.
Tu écris du code naïf ; il en déduit quelles valeurs et fonctions peuvent être
réutilisées entre les rendus.

:::compare
::bad
```tsx
// avant : mémoïsation manuelle, verbeuse et faillible
const sorted = useMemo(() => sort(items), [items]);
const onClick = useCallback(() => select(id), [id]);
```
::
::good
```tsx
// avec le compilateur : tu écris ça, il optimise
const sorted = sort(items);
const onClick = () => select(id);
```
::
:::

## Ce qu'il faut encore respecter

Le compilateur **suppose** que ton code suit les règles de React : composants
purs, pas de mutation des props/état, hooks au top level. Il ne corrige pas du
code impur — il optimise du code correct.

:::cheatsheet
- title: "Mémoïse pour toi"
  desc: "Valeurs dérivées, callbacks, et l'équivalent de memo() sur les composants."
- title: "Exige la pureté"
  desc: "Composants sans effet de bord pendant le rendu, props non mutées."
- title: "eslint-plugin-react-compiler"
  desc: "Signale le code que le compilateur ne peut pas optimiser sûrement."
:::

### Idée reçue : « plus besoin de comprendre les re-renders »

Faux. Le compilateur réduit le travail manuel, mais déboguer une perf ou un bug
de dépendance exige toujours de savoir *pourquoi* un composant re-rend. L'outil
automatise l'application, pas la compréhension.

:::callout{type="tip"}
Active le compilateur progressivement, fichier par fichier, et garde le lint
dédié. Le code qu'il refuse d'optimiser est souvent du code qui viole
discrètement les règles de React — un bon signal.
:::
