---
title: "Vue 3.6 et Vapor mode : ce qui arrive, ce que tu peux déjà tester"
slug: "vue-3-6-vapor-preview"
date: 2026-06-01
author: "L'équipe Practical Docs"
tags: ["vue", "release", "preview", "vapor"]
cover: "vue-vapor"
lead: "Vapor mode (compile-to-DOM, sans virtual DOM) et un cœur réactif refondu : Vue 3.6 marque la fin de l'ère VDOM par défaut. Le stable est attendu Q4, mais la bêta est déjà feature-complete. Voici comment l'évaluer cet été sans casser ton app."
seoTitle: "Vue 3.6 et Vapor mode — bêta feature-complete, ce que tu peux déjà tester"
seoDescription: "Vue 3.6 introduit Vapor mode (compile-to-DOM, sans VDOM) et une réactivité réécrite. La bêta est feature-complete, le stable est visé Q4 2026 : statut réel, opt-in par composant, interop VDOM, limites, et la bonne stratégie d'évaluation."
related:
  - { framework: "vue", slug: "vue-3-6" }
  - { framework: "vue", slug: "vapor-mode" }
  - { framework: "vue", slug: "reactivity-internals" }
---

Vue 3.6 n'est pas une release de plus. Elle change la **nature** de Vue : sortir du virtual DOM par défaut, et adosser la réactivité à une base plus minimale. C'est le plus gros chantier du framework depuis la v3. Le stable n'est pas encore là — visé Q4 2026 — mais la bêta est **feature-complete** et utilisable par îlots dès aujourd'hui. Si tu attends le tag stable pour t'y intéresser, tu perds six mois de préparation.

Voici comment l'évaluer maintenant, et ce qui reste à surveiller d'ici l'automne.

## Vapor mode : compile-to-DOM, sans virtual DOM

C'est la pièce maîtresse. Vapor **compile** les composants en opérations DOM directes — pas d'arbre virtuel, pas de diff. Le compilateur sait quel signal touche quel binding et n'émet que la mise à jour exacte. En benchmarks, Vapor se place au niveau de Solid et Svelte 5.

```vue
<script setup vapor>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

L'API ne change pas. Tu ajoutes `vapor` sur le `<script setup>`, et le compilateur émet un autre runtime pour **ce composant** — pas pour toute l'app. C'est opt-in **par composant**, c'est le point qui rend l'évaluation possible sans réécriture.

:::callout{type="info"}
Si tu veux la version conceptuelle (pourquoi le virtual DOM est un filet de sécurité, et ce qu'on gagne en l'enlevant), c'est dans le module senior [Vapor mode](/vue/senior/vapor-mode). Cet article-ci est le pendant pratique : où on en est aujourd'hui, et ce qu'il faut faire ce trimestre.
:::

## Statut réel : feature-complete, pas stable

Mi-2026, Vue 3.6 est en bêta. « Feature-complete » signifie que **la surface API est là** — opt-in par composant, interop avec le VDOM, parité quasi totale en rendu — mais l'écosystème (devtools, libs tierces, edge cases) est en train de rattraper. Le **mot d'ordre des mainteneurs** : utilisable pour expérimenter, **pas encore** pour basculer une app de prod en aveugle.

:::compare
::bad
```text
« Vapor est en bêta donc on attend. »
→ Tu refuses gratuitement six mois de mesure
  et tu décideras l'adoption en aveugle quand
  le stable tombera, sans données.
```
::
::good
```text
« On isole un sous-arbre sensible à la perf
  (galerie, dashboard, table) en Vapor en bêta,
  on mesure, et on a un avis chiffré avant
  le stable. »
→ Bascule éclairée Q4.
```
::
:::

## L'interop VDOM, c'est ce qui rend la cohabitation possible

Le piège habituel d'une nouvelle architecture : « si tu veux Vapor, il faut tout réécrire ». Pas ici. Le `vaporInteropPlugin` fait vivre les deux mondes dans le **même arbre** : un composant Vapor peut importer un composant VDOM standard, et inversement. Element Plus, Ant Design Vue et la plupart des bibliothèques UI continuent de fonctionner depuis l'intérieur d'un sous-arbre Vapor.

**Pourquoi c'est décisif.** Sans interop, Vapor serait condamné à être un mode pour nouveaux projets. Avec, c'est une **migration progressive par îlots** : tu commences par le composant le plus coûteux (un canvas, une liste virtuelle, une vue de données massive), tu mesures, tu remontes.

## Cœur réactif réécrit

En parallèle, `@vue/reactivity` est refondu sur une base inspirée d'**alien-signals** : graphe de dépendances plus compact, propagation paresseuse, moins d'allocations. **L'API publique** (`ref`, `computed`, `watch`, `effect`) **ne change pas**. C'est une amélioration interne — qui sert de fondation à la perf de Vapor. Pas la peine de supprimer le diff VDOM si chaque écriture de `ref` reste coûteuse.

## Limites à connaître

Trois choses à avoir en tête avant d'activer `vapor` sur un composant :

1. **Composition API uniquement.** Pas d'Options API en Vapor. Les composants qui te restent en Options ne peuvent pas y passer sans conversion.
2. **`<Suspense>` est le point sensible.** Un composant Vapor peut vivre **dans** un `<Suspense>` VDOM (interop), mais Vapor seul ne gère pas encore pleinement `<Suspense>` de bout en bout. Surveille ce point dans les devtools.
3. **Quand Vapor n'aide pas.** Si ton bottleneck est la **taille du DOM**, le **layout thrash** ou des **transformations de données lourdes** côté JS, Vapor ne sauvera rien — il optimise le coût *framework* de la mise à jour. Profile avant de migrer un composant.

## La bonne stratégie d'évaluation cet été

Ce n'est pas une migration. C'est une mesure.

1. **Pinner Vue à la 3.6 bêta** dans une branche dédiée. Pas en main.
2. **Choisir un composant cible** : le plus coûteux à rendre actuellement (souvent : une liste/table virtualisée, une visualisation, un éditeur). Profile-le tel qu'il est, note les chiffres.
3. **Activer `vapor` sur ce composant** (et seulement lui). Mesure dans la même condition. Compare.
4. **Tester les libs tierces** présentes dans le sous-arbre. C'est là que l'écosystème écart se voit.
5. **Documenter ce qui marche, ce qui casse**. C'est ce document — pas l'enthousiasme — qui pilotera l'adoption à l'automne.

:::callout{type="tip"}
Garde une condition de sortie claire : si l'interop casse une lib UI cruciale, **tu retires `vapor` du composant**, tu reviens en VDOM, et tu signales l'issue côté upstream. C'est gratuit — c'est le point fort de l'opt-in par composant.
:::

## D'ici l'automne : ce qu'il faut surveiller

- **La parité `<Suspense>`** côté Vapor — c'est le bloqueur principal pour les apps qui s'appuient sur lui.
- **L'état des devtools** : profiling, inspection des bindings Vapor, hot-reload.
- **L'adoption par les UI majeures** (Element Plus, Ant Design Vue, PrimeVue, Vuetify) — la promesse d'interop n'a de poids que si les libs la confirment.
- **Côté Nuxt** : la consigne actuelle est de **ne pas mélanger** Vapor et Nuxt 4 en prod tant que la documentation n'a pas cadré l'interop. À surveiller dans les notes de version Nuxt 4.x et 5.x.

## Le récap technique

Pour la version « références qu'on relit » plutôt que « ce qu'on en fait » : le module [Vue 3.6](/vue/next/vue-3-6) liste les changements API par API, et [Vapor mode](/vue/senior/vapor-mode) couvre le « pourquoi » conceptuel. Cet article-ci est le **plan de bataille** pour cet été.
