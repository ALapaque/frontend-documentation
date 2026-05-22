---
title: "React — ce qui arrive"
slug: "react-labs"
framework: "react"
level: "next"
order: 1
duration: 14
prerequisites: ["concurrent-features", "compiler"]
updated: 2026-05-22
seoTitle: "React — ViewTransition, Activity, useEffectEvent (ce qui arrive)"
seoDescription: "Le front React 2026 : Activity et useEffectEvent (livrés en 19.2), <ViewTransition> (expérimental), Performance Tracks et la suite du Compiler."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "vue", slug: "vue-3-6" }
---

:::callout{type="info"}
React n'annonce pas de « v20 ». La feuille de route avance par **primitives**
ajoutées aux versions 19.x et par les expérimentations React Labs. Ci-dessous :
ce qui vient d'atterrir en stable (19.2) et ce qui mûrit encore.
:::

## `<Activity>` — masquer sans démonter

Stable depuis 19.2. `<Activity>` cache une partie de l'UI **en préservant son
état** (et celui de ses enfants) au lieu de la démonter. Fini le dilemme
« démonter (perdre l'état) vs cacher en CSS (garder les effects actifs) ».

```tsx
<Activity mode={visible ? 'visible' : 'hidden'}>
  <Onglet />
</Activity>
```

## `useEffectEvent` — séparer réaction et setup

Stable depuis 19.2. Extrait la partie « réaction à un event » d'un effet, pour
qu'une valeur (ex. `theme`) à jour ne force pas un teardown/reconnect.

:::compare
::bad
```tsx
useEffect(() => {
  const c = connect(roomId);
  c.on('msg', (m) => show(m, theme)); // theme dans les deps → reconnecte
  return () => c.close();
}, [roomId, theme]);
```
::
::good
```tsx
const onMsg = useEffectEvent((m) => show(m, theme)); // lit le theme à jour
useEffect(() => {
  const c = connect(roomId);
  c.on('msg', onMsg);
  return () => c.close();
}, [roomId]); // ne reconnecte que si roomId change
```
::
:::

**Pourquoi** : `theme` n'a rien à voir avec *quand* se (re)connecter — seulement
avec *comment réagir* à un message. Le mettre dans les deps reconnectait à
chaque changement de thème. `useEffectEvent` isole cette logique « event » :
elle lit toujours les dernières valeurs sans participer au tableau de deps.

## `<ViewTransition>` — transitions animées (expérimental)

API React pour coordonner des transitions animées entre états d'UI, au-dessus de
l'API navigateur View Transitions. Encore **expérimentale** — à suivre.

:::cheatsheet
- title: "<Activity> (19.2)"
  desc: "Cache/restaure un sous-arbre en préservant son état."
- title: "useEffectEvent (19.2)"
  desc: "Sépare la réaction event du setup d'effet ; hors deps."
- title: "<ViewTransition> (exp.)"
  desc: "Transitions animées entre états, sur l'API navigateur."
- title: "Performance Tracks (19.2)"
  desc: "Pistes dédiées dans Chrome DevTools (scheduler, rendu, effets)."
- title: "React Compiler"
  desc: "Stable depuis 2025 ; l'équipe continue d'investir dessus."
:::

:::callout{type="tip"}
Beaucoup de ces « nouveautés » sont déjà stables en 19.2 — vérifie ta version
avant de supposer qu'il te faut une canary. Seul `<ViewTransition>` reste
expérimental à ce jour.
:::
