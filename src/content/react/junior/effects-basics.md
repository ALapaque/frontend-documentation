---
title: "Effects : les bases"
slug: "effects-basics"
framework: "react"
level: "junior"
order: 3
duration: 14
prerequisites: ["state-basics"]
updated: 2026-05-22
seoTitle: "useEffect — dépendances et cleanup (Guide Junior React)"
seoDescription: "useEffect démystifié : le tableau de dépendances, le cleanup, et quand ne PAS l'utiliser."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "lifecycle" }
  - { framework: "vue", slug: "lifecycle" }
---

## Un effet, c'est une synchronisation

`useEffect` synchronise ton composant avec un système **extérieur** à React :
une API, un timer, un abonnement, le titre du document. Ce n'est pas un hook
« après le rendu » à tout faire.

```tsx
useEffect(() => {
  const id = setInterval(() => setTick((t) => t + 1), 1000);
  return () => clearInterval(id); // cleanup
}, []); // [] = au montage seulement
```

## Le tableau de dépendances

React relance l'effet quand une dépendance change. Le omettre relance à chaque
rendu ; le mentir cache des bugs.

:::cheatsheet
- title: "[] (vide)"
  desc: "Exécuté une fois au montage, nettoyé au démontage."
- title: "[a, b]"
  desc: "Ré-exécuté quand a ou b change (comparaison par référence)."
- title: "absent"
  desc: "Ré-exécuté à chaque rendu — presque toujours un bug."
:::

## Le cleanup n'est pas optionnel

La fonction retournée s'exécute avant la prochaine exécution **et** au démontage.
Sans elle : abonnements en double, timers fantômes, fuites mémoire.

:::compare
::bad
```tsx
useEffect(() => {
  socket.on('msg', onMsg); // jamais retiré
}, []);
```
::
::good
```tsx
useEffect(() => {
  socket.on('msg', onMsg);
  return () => socket.off('msg', onMsg);
}, []);
```
::
:::

**Pourquoi** : React rejoue l'effet à chaque changement de dépendance (et le Strict Mode le monte/démonte deux fois en dev) sans jamais défaire le précédent si tu ne retournes pas de cleanup. Sans le `socket.off`, chaque exécution empile un nouvel abonnement sur le même `onMsg` : le callback finit appelé en double, triple, et le handler survit même après le démontage du composant — fuite mémoire.

:::callout{type="warn"}
N'utilise pas un effet pour **dériver** un état d'un autre (calcule-le pendant
le rendu) ni pour réagir à un clic (mets la logique dans le handler). L'effet
est réservé à la synchronisation avec l'extérieur.
:::
