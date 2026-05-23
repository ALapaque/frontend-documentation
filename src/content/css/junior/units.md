---
title: "Les unités CSS"
slug: "units"
framework: "css"
level: "junior"
order: 3
duration: 12
prerequisites: ["box-model"]
updated: 2026-05-23
seoTitle: "CSS — Unités px, rem, em, %, vw/vh et clamp()"
seoDescription: "Absolu vs relatif : pourquoi rem protège le zoom utilisateur, le piège de l'em qui se compose, vw/vh/ch et clamp() pour un texte fluide accessible."
ogVariant: "sage"
related:
  - { framework: "css", slug: "box-model" }
---

## Absolu ou relatif : à quoi se rattache la valeur

Une longueur CSS est soit **absolue**, soit **relative**. Le `px` est absolu : il
vaut toujours la même chose, peu importe le contexte. Tous les autres (`rem`, `em`,
`%`, `vw`, `vh`, `ch`) sont relatifs : ils se **calculent** à partir d'une
référence — la taille de police racine, celle du parent, la dimension du conteneur
ou la largeur du viewport. Choisir une unité, c'est choisir **à quoi ta valeur
réagit** quand le contexte change.

Manipule les curseurs ci-dessous pour voir comment la même valeur s'exprime
différemment selon l'unité et la référence.

:::demo{kind="units"}
:::

:::cheatsheet
- title: "px"
  desc: "Absolu. Un pixel logique. Idéal pour bordures fines (`1px`)."
- title: "rem"
  desc: "Relatif à la police racine (`:root`). La référence stable de tout le document."
- title: "em"
  desc: "Relatif à la `font-size` de l'élément courant. Se compose avec ses ancêtres."
- title: "%"
  desc: "Relatif à la propriété correspondante du parent (souvent la largeur)."
- title: "vw / vh"
  desc: "1% de la largeur / hauteur du viewport. Réagit à la taille de la fenêtre."
- title: "ch"
  desc: "Largeur du caractère « 0 » dans la police courante. Parfait pour caler des colonnes de texte."
:::

## Pourquoi `rem` protège l'accessibilité

Le `rem` se calcule à partir de la `font-size` de l'élément racine `<html>`. Par
défaut elle vaut `16px`, donc `1rem = 16px`. La différence cruciale avec le `px`
n'est pas la valeur de départ, mais ce qui se passe quand l'utilisateur **change
la taille de police par défaut** de son navigateur — un réglage d'accessibilité
courant chez les personnes malvoyantes.

:::compare
::bad
```css
.titre {
  font-size: 24px;   /* figé */
  padding: 16px;
}
```
::
::good
```css
.titre {
  font-size: 1.5rem; /* = 24px par défaut, mais suit l'utilisateur */
  padding: 1rem;
}
```
::
:::

**Pourquoi.** Quand l'utilisateur règle sa police par défaut à `20px`, la racine
devient `20px` et **tous** les `rem` se recalculent : `1.5rem` passe à `30px`,
`1rem` à `20px`. La mise en page grandit proportionnellement et reste cohérente.
Une valeur en `px` ignore ce réglage et reste à `24px` — le texte ne grandit pas,
et l'utilisateur est forcé de recourir au zoom navigateur, qui agrandit aussi les
images et casse souvent les layouts. Le `rem` respecte une intention exprimée par
l'utilisateur ; le `px` la piétine.

:::callout{type="tip"}
Garde la racine à sa valeur native (ne fais **pas** `html { font-size: 62.5% }`
pour « simplifier les calculs ») : ça réintroduit un décalage avec la préférence
utilisateur. Raisonne directement en `rem` à partir de 16px.
:::

## Le piège de l'`em` : il se compose

L'`em` ressemble au `rem`, mais sa référence est la `font-size` de **l'élément
lui-même** (héritée du parent pour `font-size`, ou la sienne pour les autres
propriétés). Comme la `font-size` se transmet de parent en enfant, les `em`
**s'empilent** en cascade.

```css
.liste { font-size: 1.2em; }
/* trois .liste imbriquées : 1.2 × 1.2 × 1.2 ≈ 1.73em du texte de base.
   Le texte enfle à chaque niveau, souvent sans qu'on l'ait voulu. */
```

**Pourquoi.** Chaque `.liste` lit la `font-size` calculée de son parent — qui est
déjà le résultat d'un `1.2em`. La multiplication se reporte à chaque niveau
d'imbrication : c'est de la composition, pas une valeur fixe. Le `rem`, lui, vise
toujours la racine et ne se compose jamais. **Règle pratique** : `rem` pour les
tailles de police globales et les espacements de layout (prévisible) ; `em` quand
tu veux justement qu'une mesure suive la police locale — par exemple un `padding`
de bouton qui doit grandir avec son texte.

## `vw`, `vh`, `%` : se rattacher au conteneur ou à l'écran

Le `%` se mesure par rapport au **parent** (la largeur du parent pour `width`, sa
hauteur pour `height`). `vw`/`vh` ignorent le parent et visent le **viewport** :
`50vw` = la moitié de la largeur de fenêtre, où que soit l'élément.

```css
.colonne  { width: 50%; }    /* moitié du parent */
.banniere { width: 100vw; }  /* toute la largeur de l'écran, déborde des marges du parent */
```

:::callout{type="warn"}
`100vw` inclut la largeur de la barre de défilement verticale sur certains
navigateurs desktop, ce qui provoque un léger débordement horizontal. Pour une
section pleine largeur dans un conteneur centré, préfère `width: 100%` quand c'est
possible, ou les unités `dvw`/`dvh` qui suivent la zone réellement visible sur
mobile (barre d'adresse qui se rétracte).
:::

## `clamp()` : un texte fluide entre deux bornes

Pour qu'un titre grandisse avec l'écran **sans** media query, combine une unité
viewport et des bornes fixes. `clamp(min, idéal, max)` renvoie la valeur idéale
tant qu'elle reste entre `min` et `max`, sinon elle est bornée.

```css
.hero h1 {
  /* jamais < 1.75rem, jamais > 3.5rem, sinon ~5% de la largeur d'écran */
  font-size: clamp(1.75rem, 1rem + 4vw, 3.5rem);
}
```

**Pourquoi.** Le terme central `1rem + 4vw` mélange une part fixe (le `rem`, qui
garde le respect du zoom utilisateur) et une part fluide (le `vw`, qui suit la
fenêtre). Le `rem` dans l'idéal est essentiel : un `clamp()` 100% en `vw`
ignorerait la préférence de police de l'utilisateur entre les deux bornes. Les
bornes `min`/`max` empêchent le texte de devenir illisiblement petit sur mobile ou
gigantesque sur un écran large. Tu obtiens une typographie continue avec une seule
ligne, au lieu d'une cascade de breakpoints.

:::callout{type="tip"}
Le même patron sert pour les espacements fluides : `padding: clamp(1rem, 5vw, 4rem)`
donne des marges de section qui respirent sur grand écran et restent compactes sur
mobile, toujours sans media query.
:::
