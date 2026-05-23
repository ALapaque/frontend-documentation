---
title: "Subgrid"
slug: "subgrid"
framework: "css"
level: "senior"
order: 6
duration: 14
prerequisites: ["grid"]
updated: 2026-05-23
seoTitle: "CSS Subgrid — aligner le contenu des enfants sur la grille du parent"
seoDescription: "grid-template-rows/columns: subgrid pour aligner titres, corps et boutons de cartes sur une grille commune : héritage des lignes nommées et du gap, le piège du grid-row span manquant, et le comparatif avant/après."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "grid" }
---

## Le problème que subgrid résout

CSS Grid place des éléments sur une grille, mais chaque élément reste une **boîte
opaque** : sa hauteur interne ne dialogue pas avec ses voisins. Le cas classique est
une rangée de cartes — image, titre, corps, bouton. Si un titre tient sur deux lignes
chez l'un et une seule chez l'autre, les boutons ne s'alignent plus : chaque carte
dispose son contenu pour elle-même, sans coordination. Avant subgrid, on s'en sortait
à coups de hauteurs fixes fragiles ou de JavaScript de mesure. **Subgrid** permet à un
enfant de la grille d'emprunter les pistes de son parent : les éléments internes de
toutes les cartes s'alignent alors sur **les mêmes lignes**.

## `grid-template-rows: subgrid`

Une grille imbriquée définit normalement ses **propres** pistes, sans aucun rapport
avec celles du parent. En remplaçant la définition par le mot-clé `subgrid`, l'enfant
déclare : « sur cet axe, n'invente pas de pistes, **réutilise** celles que le parent
m'a allouées ».

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* trois rangées partagées : image, contenu extensible, action */
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}
.card {
  display: grid;
  grid-row: span 3;            /* la carte occupe les 3 rangées du parent */
  grid-template-rows: subgrid; /* et adopte ces 3 rangées comme les siennes */
}
```

L'enfant `.card` ne crée plus ses lignes : ses propres enfants (`img`, `.body`,
`.cta`) se placent dans `row 1 / 2`, `2 / 3`, `3 / 4` — c'est-à-dire **les pistes du
parent**. Comme la rangée « image » de toutes les cartes est la même piste physique,
les boutons retombent automatiquement sur la même ligne du bas.

:::callout{type="info"}
`subgrid` fonctionne **par axe** : tu peux faire hériter uniquement `grid-template-rows`,
uniquement `grid-template-columns`, ou les deux. Un enfant peut être subgrid en lignes et
définir ses propres colonnes librement — les deux axes sont totalement indépendants.
:::

## L'héritage : lignes nommées et gap

Quand un axe passe en `subgrid`, l'enfant n'hérite pas seulement du **nombre** de
pistes : il hérite aussi des **lignes nommées** du parent et de son **gap**.

```css
.layout {
  display: grid;
  grid-template-columns: [bord-g] 1fr [contenu] minmax(0, 60ch) [fin] 1fr [bord-d];
  gap: 2rem;
}
.article {
  grid-column: bord-g / bord-d;
  display: grid;
  grid-template-columns: subgrid; /* récupère bord-g, contenu, fin, bord-d ET le gap */
}
.article > figure { grid-column: bord-g / contenu; } /* nom hérité, utilisable ici */
```

Le `gap` du parent s'applique aux pistes empruntées, ce qui garantit un rythme visuel
identique entre la grille externe et la grille interne. Tu peux **surcharger** le gap
côté enfant si tu veux un espacement différent à l'intérieur, mais par défaut il suit
le parent — c'est ce qui maintient l'alignement pixel-perfect.

:::cheatsheet
- title: "grid-template-rows: subgrid"
  desc: "L'enfant adopte les rangées du parent au lieu de créer les siennes."
- title: "grid-template-columns: subgrid"
  desc: "Idem sur l'axe des colonnes ; les deux axes sont indépendants."
- title: "grid-row: span N"
  desc: "Indispensable : déclare combien de pistes parentes l'enfant couvre."
- title: "Lignes nommées héritées"
  desc: "Les noms `[bord-g]`, `[contenu]`… du parent restent visibles dans le subgrid."
- title: "gap hérité"
  desc: "Le gap du parent s'applique aux pistes empruntées ; surchargeable localement."
- title: "Imbrication"
  desc: "Un subgrid peut lui-même être l'enfant d'un autre subgrid (chaînage)."
:::

## Le piège n°1 : oublier `grid-row: span N`

C'est l'erreur qui fait croire que « subgrid ne marche pas ». Déclarer
`grid-template-rows: subgrid` ne suffit pas : il faut **dire combien de pistes** du
parent l'enfant occupe, sinon il n'en récupère qu'une seule.

:::compare
::bad
```css
.card {
  display: grid;
  grid-template-rows: subgrid; /* sans span : l'enfant n'occupe qu'1 piste */
}
/* résultat : le contenu se tasse dans une seule rangée, aucun alignement */
```
::
::good
```css
.card {
  display: grid;
  grid-row: span 3;            /* explicite : la carte couvre 3 rangées parentes */
  grid-template-rows: subgrid;
}
```
::
:::

**Pourquoi.** `subgrid` signifie « réutilise les pistes que tu **couvres** dans le
parent ». Or, par placement automatique, un enfant ne couvre qu'**une seule** piste
implicite. Sans `grid-row: span 3`, l'enfant n'occupe qu'une rangée du parent : le
subgrid n'a donc qu'**une** piste à partager, et tous les sous-enfants s'empilent
dedans. Le `span` n'est pas décoratif — c'est lui qui définit la **zone** de pistes
empruntées. Le mot-clé `subgrid` ne fait que dire « adopte cette zone » ; encore
faut-il que la zone existe et fasse la bonne taille.

## Avant / après subgrid

Le contraste se voit le mieux sur l'alignement inter-cartes. Sans subgrid, chaque
carte est une grille isolée ; avec, elles partagent la même règle horizontale.

:::compare
::bad
```css
/* grille classique imbriquée : pistes locales, indépendantes */
.card {
  display: grid;
  grid-template-rows: auto 1fr auto; /* recalculé carte par carte */
}
/* un titre sur 2 lignes décale le corps et le bouton de CETTE carte seule */
```
::
::good
```css
/* subgrid : toutes les cartes lisent les mêmes pistes du parent */
.cards { display: grid; grid-template-rows: auto 1fr auto; }
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
}
/* la rangée "titre" est dimensionnée une fois, pour toutes les cartes */
```
::
:::

**Pourquoi.** Avec `grid-template-rows: auto 1fr auto` redéfini sur chaque `.card`,
les trois `auto` sont résolus **localement** : la rangée « titre » de la carte A vaut
la hauteur du titre de A, celle de B vaut la hauteur du titre de B. Rien ne les
synchronise. En passant en `subgrid`, les trois pistes ne sont calculées qu'**une
fois**, au niveau du parent `.cards` : la rangée « titre » prend la hauteur du **plus
grand** titre parmi toutes les cartes, et chaque carte s'aligne sur ce maximum commun.
L'alignement n'est plus un effet de bord chanceux ; il découle directement du fait que
les cartes lisent **la même** définition de pistes au lieu d'en posséder chacune une
copie.

## Subgrid vs grilles imbriquées : quand utiliser quoi

Une grille imbriquée ordinaire reste le bon choix quand l'enfant a une structure
**autonome** qui n'a aucune raison de s'aligner sur ses voisins (une mini-grille de
tags, un layout interne sans relation avec les autres cartes). Subgrid n'a d'intérêt
que lorsqu'il faut une **continuité d'alignement** entre la grille externe et le
contenu profond : cartes en rangée, formulaires label/champ alignés sur plusieurs
blocs, tableaux faits en grid. La règle mentale : *si je veux que des lignes traversent
plusieurs enfants, c'est subgrid ; sinon, c'est une grille imbriquée normale.*

:::callout{type="tip"}
Subgrid est stable dans tous les navigateurs evergreen depuis 2023 (Firefox dès 2022,
Chromium et Safari en 2023). En 2026 c'est une fonctionnalité de référence : pas besoin
de `@supports` pour la majorité des audiences. Si tu dois encore couvrir un parc ancien,
garde un fallback `grid-template-rows: auto 1fr auto` sur l'enfant — il sera simplement
remplacé par le subgrid là où il est reconnu.
:::
