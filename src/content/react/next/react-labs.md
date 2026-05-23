---
title: "React — ce qui arrive"
slug: "react-labs"
framework: "react"
level: "next"
order: 1
duration: 14
prerequisites: ["concurrent-features", "compiler"]
updated: 2026-05-23
seoTitle: "React 2026 — Compiler v1 stable, Activity, useEffectEvent, ViewTransition"
seoDescription: "Le front React mi-2026 : Compiler v1.0 stable, Activity et useEffectEvent livrés (19.2), <ViewTransition> encore expérimental, et les CVE RSC de déc. 2025 à patcher."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "vue", slug: "vue-3-6" }
---

:::callout{type="info"}
React n'annonce pas de « v20 ». La feuille de route avance par **primitives**
ajoutées aux versions 19.x et par les expérimentations React Labs. État mi-2026 :
**19.2** a livré `<Activity>` et `useEffectEvent`, le **Compiler est passé v1.0
stable**, et `<ViewTransition>` reste expérimental.
:::

## React Compiler v1.0 — stable

C'est l'événement de cette période : le **React Compiler atteint la v1.0
stable**. Il mémoïse automatiquement composants et hooks au build, en analysant
les dépendances réelles — ce qui rend `memo`, `useMemo` et `useCallback`
**majoritairement inutiles** quand il est activé.

:::compare
::bad
```tsx
// Mémoïsation manuelle : à maintenir à la main, facile à oublier ou à mal câbler
const items = useMemo(() => filter(data, q), [data, q]);
const onPick = useCallback((id) => select(id), [select]);
const Row = memo(function Row(props) { /* … */ });
```
::
::good
```tsx
// Compiler v1.0 activé : tu écris du code idiomatique, il mémoïse pour toi
const items = filter(data, q);
const onPick = (id) => select(id);
function Row(props) { /* … */ }
```
::
:::

**Pourquoi.** La mémoïsation manuelle est du bruit qui dérive : un tableau de
deps mal renseigné casse silencieusement, et la plupart des `useMemo` ne couvrent
même pas un vrai coût. Le Compiler raisonne sur le graphe de dépendances au
build et insère la mémoïsation correcte et exhaustive — tu supprimes le
boilerplate sans perdre la perf. Active-le progressivement (ESLint plugin +
opt-in par fichier) plutôt que d'un coup.

## `<Activity>` — masquer sans démonter

Stable depuis **19.2**. `<Activity>` cache une partie de l'UI **en préservant son
état** (et celui de ses enfants) au lieu de la démonter. Fini le dilemme
« démonter (perdre l'état) vs cacher en CSS (garder effects et listeners actifs) ».
En mode `hidden`, React peut aussi dé-prioriser le rendu du sous-arbre.

```tsx
<Activity mode={visible ? 'visible' : 'hidden'}>
  <Onglet />
</Activity>
```

## `useEffectEvent` — séparer réaction et setup

Stable depuis **19.2**. Extrait la partie « réaction à un event » d'un effet,
pour qu'une valeur à jour (ex. `theme`) ne force pas un teardown/reconnect. Voir
le module dédié niveau medior pour le détail des règles.

```tsx
const onMsg = useEffectEvent((m) => show(m, theme)); // lit le theme à jour
useEffect(() => {
  const c = connect(roomId);
  c.on('msg', onMsg);
  return () => c.close();
}, [roomId]); // ne reconnecte que si roomId change
```

## `<ViewTransition>` — transitions animées (toujours expérimental)

API React pour coordonner des transitions animées entre états d'UI, au-dessus de
l'API navigateur View Transitions. Toujours **expérimentale** mi-2026 — pas dans
une release stable. À tester en canary, pas à mettre en prod.

## Sécurité : les CVE RSC de décembre 2025

:::callout{type="warn"}
En **décembre 2025**, des vulnérabilités critiques de type **RCE** (exécution de
code à distance) ont été corrigées dans la chaîne **React Server Components** /
Server Functions, touchant les versions **19.0.0 à 19.2.2**. Si tu utilises RSC
ou des Server Functions, **mets à jour vers 19.2.3+** (ou la version patchée
indiquée par l'avis de sécurité). La désérialisation des arguments de Server
Functions était le vecteur — toute app SSR/RSC exposée est concernée.
:::

**Pourquoi** c'est sérieux : une Server Function reçoit des arguments
sérialisés depuis le client ; un défaut de désérialisation permettait de faire
exécuter du code côté serveur. Ce n'est pas un bug de rendu : c'est un chemin
d'exécution serveur. Patche d'abord, audite ensuite.

:::cheatsheet
- title: "Compiler v1.0 — STABLE"
  desc: "Mémoïsation automatique au build. Rend memo/useMemo/useCallback majoritairement superflus."
- title: "<Activity> (19.2)"
  desc: "Cache/restaure un sous-arbre en préservant son état ; dé-priorise le rendu caché."
- title: "useEffectEvent (19.2)"
  desc: "Sépare la réaction event du setup d'effet ; hors deps."
- title: "<ViewTransition> (exp.)"
  desc: "Transitions animées entre états. Toujours expérimental mi-2026."
- title: "CVE RSC (déc. 2025)"
  desc: "RCE en 19.0.0–19.2.2 sur RSC/Server Functions. Patcher en 19.2.3+."
:::

:::callout{type="tip"}
Beaucoup de ces « nouveautés » sont déjà stables en 19.2 — vérifie ta version
avant de supposer qu'il te faut une canary. Priorité opérationnelle mi-2026 :
**patcher la CVE RSC**, puis activer le **Compiler** pour dégraisser ta
mémoïsation manuelle.
:::
