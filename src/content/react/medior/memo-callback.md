---
title: "memo / useMemo / useCallback"
slug: "memo-callback"
framework: "react"
level: "medior"
order: 3
duration: 16
prerequisites: ["hooks-rules"]
updated: 2026-05-22
seoTitle: "memo, useMemo, useCallback — quand et quand pas"
seoDescription: "La mémoïsation React sans cargo-culting : ce qu'elle coûte, ce qu'elle évite, et quand le compilateur la rend inutile."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "change-detection" }
  - { framework: "vue", slug: "computed-watch" }
---

## Le problème : re-render en cascade

Quand un composant se re-rend, ses enfants aussi — par défaut. La mémoïsation
casse cette cascade quand elle est coûteuse et inutile.

:::cheatsheet
- title: "memo(Component)"
  desc: "Saute le re-render si les props (par référence) n'ont pas changé."
- title: "useMemo(fn, deps)"
  desc: "Mémoïse une valeur calculée coûteuse."
- title: "useCallback(fn, deps)"
  desc: "Mémoïse une fonction, pour qu'elle reste stable comme prop."
:::

## L'erreur courante : memo sans callbacks stables

`memo` compare les props par référence. Si tu passes une fonction inline, sa
référence change à chaque rendu → `memo` ne sert à rien.

:::compare
::bad
```tsx
const Row = memo(RowImpl);
// parent
<Row onSelect={() => select(id)} />; // nouvelle fonction → memo inutile
```
::
::good
```tsx
const onSelect = useCallback(() => select(id), [id]);
<Row onSelect={onSelect} />;
```
::
:::

### Idée reçue : « mémoïser partout accélère »

Non. Chaque `useMemo`/`useCallback` a un coût (comparaison de deps, mémoire).
Sur du calcul trivial, c'est une perte nette. Mesure d'abord ; mémoïse les
re-renders **prouvés** coûteux.

:::callout{type="tip"}
Avec le React Compiler, l'essentiel de cette mémoïsation devient automatique —
tu écris du code naïf, le compilateur insère les memos. Apprends quand même les
mécanismes : ils expliquent ce que le compilateur fait à ta place.
:::
