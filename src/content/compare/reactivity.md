---
title: "Réactivité"
lead: "Qu'est-ce qui déclenche, exactement, le recalcul d'une vue ?"
updated: 2026-05-22
seoTitle: "Réactivité — Angular vs React vs Vue"
seoDescription: "Comment Angular (signals), React (re-render) et Vue (proxies) décident qu'une vue doit changer."
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "compiler" }
  - { framework: "vue", slug: "reactivity-internals" }
---

## Le déclencheur

| | Angular | React | Vue |
| --- | --- | --- | --- |
| Unité réactive | Signal | Composant | Proxy / ref |
| Détection | Lecture tracée | Re-exécution | Get/set interceptés |
| Re-render | Ce qui lit le signal | Sous-arbre entier | Effet dépendant |

## Déclarer une valeur dérivée

:::tri{title="Une valeur doublée et réactive"}
::angular
```ts
const n = signal(2);
const double = computed(() => n() * 2);
```
::
::react
```tsx
const [n, setN] = useState(2);
const double = useMemo(() => n * 2, [n]);
```
::
::vue
```ts
const n = ref(2);
const double = computed(() => n.value * 2);
```
::
:::

## Verdict

Angular et Vue partagent le même fond — un graphe de dépendances tracé à la
lecture — quand React reconcilie un sous-arbre puis s'appuie sur la mémoïsation
(ou le compilateur) pour éviter le travail inutile. Comprendre *qui* re-rend
chez React, et *quoi* est tracé chez Angular/Vue, suffit à éliminer 90 % des
bugs de perf.
