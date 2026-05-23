---
title: "Flexbox"
slug: "flexbox"
framework: "css"
level: "medior"
order: 1
duration: 16
prerequisites: ["box-model"]
updated: 2026-05-23
seoTitle: "CSS Flexbox — modèle mental et démo interactive"
seoDescription: "Comprendre flexbox par la pratique : axe principal vs transversal, justify-content, align-items, flex-grow/shrink/basis — avec une démo interactive."
ogVariant: "sage"
related:
  - { framework: "css", slug: "grid" }
---

## Une dimension à la fois

Flexbox distribue de l'espace le long d'**un seul axe**. Tu choisis la direction
avec `flex-direction`, puis tu alignes : `justify-content` agit sur l'**axe
principal** (celui de la direction), `align-items` sur l'**axe transversal**
(perpendiculaire). C'est toute la mécanique — le reste n'est que conséquence.

Change les propriétés ci-dessous et regarde les boîtes se réorganiser en direct.

:::demo{kind="flexbox"}
:::

:::callout{type="tip"}
Le piège mental le plus courant : croire que `justify-content` est « horizontal »
et `align-items` « vertical ». C'est faux dès que `flex-direction: column` —
les axes basculent. Pense **principal / transversal**, jamais haut/bas/gauche/droite.
:::

## Les trois propriétés de l'enfant

Sur le conteneur tu décides de la distribution globale ; sur chaque enfant, la
shorthand `flex` règle son comportement individuel. `flex: grow shrink basis`.

:::cheatsheet
- title: "flex-grow"
  desc: "Part de l'espace libre que l'élément absorbe. 0 = ne grandit pas."
- title: "flex-shrink"
  desc: "Vitesse à laquelle il rétrécit quand ça déborde. 0 = ne rétrécit jamais."
- title: "flex-basis"
  desc: "Taille de départ avant répartition. `auto` = taille du contenu."
- title: "flex: 1"
  desc: "Raccourci pour `1 1 0` — colonnes égales qui remplissent la ligne."
:::

## Le piège : `flex: 1` vs `flex-grow: 1`

Les deux font grandir l'élément, mais le `basis` diffère et ça change tout quand
les contenus ont des tailles inégales.

:::compare
::bad
```css
/* basis: auto → la taille du contenu compte AVANT la répartition.
   Une colonne avec plus de texte sera plus large que les autres. */
.col {
  flex-grow: 1;
}
```
::
::good
```css
/* flex: 1 = 1 1 0 → basis 0, le contenu ne compte pas.
   Trois colonnes strictement égales, quel que soit leur texte. */
.col {
  flex: 1;
}
```
::
:::

**Pourquoi.** Avec `flex-basis: auto` (le défaut de `flex-grow`), l'algorithme
part de la taille intrinsèque de chaque élément puis distribue le *reste*. Les
écarts de contenu persistent donc. Avec `flex: 1` le basis est `0` : tous les
éléments partent de zéro et se partagent **tout** l'espace à parts égales.

## `margin: auto`, l'astuce méconnue

Dans un conteneur flex, une marge `auto` absorbe tout l'espace libre de son côté.
C'est la façon idiomatique de pousser un élément à l'opposé sans `justify-content`.

```css
.bar {
  display: flex;
  gap: 12px;
}
/* loge le bouton « Déconnexion » tout à droite, le reste reste à gauche */
.bar .logout {
  margin-left: auto;
}
```

## Quand préférer Grid

Flexbox excelle pour une rangée ou une colonne : barres d'outils, listes de tags,
centrage. Dès que tu alignes sur **deux** axes simultanément (lignes *et*
colonnes qui doivent s'aligner entre elles), c'est le signe que Grid est l'outil.
Ce n'est pas l'un ou l'autre — on imbrique souvent du flex dans des cellules de grid.
