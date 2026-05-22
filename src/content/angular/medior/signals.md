---
title: "Signals"
slug: "signals"
framework: "angular"
level: "medior"
order: 1
duration: 18
prerequisites: ["data-binding", "lifecycle"]
updated: 2026-05-22
seoTitle: "Angular Signals — Guide complet pour Medior"
seoDescription: "signal(), computed(), effect() — la réactivité fine d'Angular, ses pièges et ses patterns de migration depuis RxJS."
ogVariant: "gold"
related:
  - { framework: "react", slug: "state-basics" }
  - { framework: "vue", slug: "reactivity-basics" }
---

## Le modèle mental

Un **signal** est un conteneur de valeur réactif. Tu le lis comme une fonction,
tu le mets à jour explicitement. Angular sait alors *exactement* quelles vues
dépendent de quelle valeur — pas de vérification d'arbre, pas de zone.

```ts
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
const double = computed(() => count() * 2);

effect(() => console.log('count =', count(), 'double =', double()));

count.set(1);          // déclenche le computed + l'effect
count.update((n) => n + 1);
```

Trois primitives, trois rôles :

:::cheatsheet
- title: "signal(initial)"
  desc: "Source de vérité mutable. Lecture `s()`, écriture `set` / `update`."
- title: "computed(fn)"
  desc: "Dérivé en lecture seule, mémoïsé, recalculé à la demande."
- title: "effect(fn)"
  desc: "Effet de bord réactif. S'exécute après chaque changement de ses deps."
:::

## Le piège classique : muter sans notifier

Un signal compare ses valeurs par référence. Muter un objet en place ne
déclenche **rien**.

:::compare
::bad
```ts
const user = signal({ name: 'Ada' });
user().name = 'Grace';   // muté en place → aucune notification
```
::
::good
```ts
const user = signal({ name: 'Ada' });
user.update((u) => ({ ...u, name: 'Grace' }));
```
::
:::

:::callout{type="tip"}
Quand tu hésites entre `set` et `update` : `set` pour une valeur indépendante de
l'ancienne, `update` quand la nouvelle valeur dérive de l'actuelle.
:::

### Idée reçue : « un effect, c'est comme un useEffect »

Non. Un `effect` Angular suit ses dépendances **automatiquement** — pas de
tableau de deps. Il ne sert pas à synchroniser de l'état dérivé (c'est le rôle
de `computed`), mais à produire des effets de bord : logs, DOM impératif,
intégrations tierces.

:::callout{type="warn"}
N'écris jamais dans un signal depuis un `effect` sans `allowSignalWrites`. Tu
crées des boucles de mise à jour difficiles à tracer.
:::
