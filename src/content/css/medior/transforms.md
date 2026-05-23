---
title: "Transforms"
slug: "transforms"
framework: "css"
level: "medior"
order: 5
duration: 13
prerequisites: ["transitions"]
updated: 2026-05-23
seoTitle: "CSS Transforms — translate, rotate, scale, ordre et compositing"
seoDescription: "translate/rotate/scale/skew, pourquoi l'ordre des transformations compte, transform-origin, perspective et 3D, et pourquoi les transforms n'engendrent pas de reflow."
ogVariant: "gold"
related:
  - { framework: "css", slug: "transitions" }
---

## Déformer sans toucher au flux

`transform` applique une transformation géométrique à un élément — déplacement,
rotation, mise à l'échelle, cisaillement — **sans modifier sa boîte dans le flux**.
Visuellement l'élément bouge, mais le layout autour de lui ne bronche pas : sa
place réservée reste intacte. Manipule les curseurs ci-dessous pour composer
plusieurs transformations et observer l'effet de leur ordre :

:::demo{kind="transforms"}
:::

## Les quatre fonctions de base

```css
.box {
  /* déplacement : axes x et y, accepte % (du propre élément) */
  transform: translate(40px, -10px);
}
.box {
  /* rotation : angle en deg / turn / rad, sens horaire */
  transform: rotate(15deg);
}
.box {
  /* mise à l'échelle : 1 = taille normale, 0.5 = moitié, négatif = miroir */
  transform: scale(1.2);
}
.box {
  /* cisaillement : incline les côtés, rarement utile seul */
  transform: skew(8deg, 0);
}
```

En 2026, ces transformations existent aussi en **propriétés individuelles** —
`translate`, `rotate`, `scale` — qu'on peut animer indépendamment sans réécrire la
chaîne entière. Pratique pour transitionner uniquement la rotation tout en laissant
le déplacement piloté ailleurs :

```css
.icon {
  translate: 0 0;
  rotate: 0deg;
  transition: rotate 200ms ease; /* anime rotate sans toucher à translate */
}
.icon:hover { rotate: 90deg; }
```

:::cheatsheet
- title: "translate(x, y)"
  desc: "Déplace. `translateX/Y/Z`, ou la propriété `translate`. `%` = relatif à l'élément."
- title: "rotate(angle)"
  desc: "Tourne autour de l'origine. `rotateX/Y/Z` pour la 3D."
- title: "scale(n)"
  desc: "Redimensionne. `scale(2, 0.5)` = large et plat. Affecte aussi le contenu."
- title: "skew(ax, ay)"
  desc: "Cisaille les axes. Déforme le texte, à manier avec parcimonie."
- title: "transform-origin"
  desc: "Point pivot des transformations. Défaut `50% 50%` (centre)."
:::

## L'ordre des transformations compte

Une transform `matrix` n'est pas commutative : `translate` puis `rotate` ne donne
pas le même résultat que `rotate` puis `translate`. Les fonctions s'appliquent de
**droite à gauche** dans le système de coordonnées de l'élément.

:::compare
::bad
```css
/* on veut « pousser à droite puis incliner » mais l'ordre trahit l'intention */
.tag { transform: rotate(20deg) translateX(60px); }
```
::
::good
```css
/* translate d'abord, rotation ensuite : le déplacement reste horizontal */
.tag { transform: translateX(60px) rotate(20deg); }
```
::
:::

**Pourquoi.** Chaque fonction transforme aussi le **repère** dans lequel la
suivante s'exécute. Dans `rotate(20deg) translateX(60px)`, le `translateX`
s'applique en dernier mais dans un repère **déjà tourné de 20°** : l'élément part
donc en diagonale, pas vers la droite. Mathématiquement, le navigateur multiplie
les matrices de gauche à droite, mais comme un point se note à droite de la
matrice (`M·p`), c'est la transformation la plus à droite qui agit en premier sur
le point. Retenir « la dernière fonction écrite agit en premier sur l'élément »
évite la confusion la plus fréquente du débutant.

## `transform-origin` : choisir le pivot

Par défaut tout pivote et se met à l'échelle autour du **centre** de l'élément
(`50% 50%`). `transform-origin` déplace ce point d'ancrage — un menu qui s'ouvre
depuis son coin supérieur gauche, une carte qui tourne sur un bord.

```css
.flip {
  transform-origin: left center; /* pivote sur l'arête gauche */
  transition: transform 300ms ease;
}
.flip:hover { transform: rotateY(180deg); }
```

:::callout{type="tip"}
`transform-origin` accepte mots-clés (`top right`), longueurs et pourcentages, et
même une troisième valeur `z` pour la 3D. Pour un effet « porte qui s'ouvre »,
combine `transform-origin: left` et `rotateY` — le pivot fait toute la différence
de réalisme.
:::

## La 3D en bref : `perspective`

Les fonctions `rotateX`, `rotateY`, `translateZ` opèrent dans l'espace, mais sans
**perspective** elles paraissent plates (projection orthographique). `perspective`
définit la distance de l'observateur : plus la valeur est petite, plus la
déformation est marquée.

```css
.scene { perspective: 800px; } /* sur le parent : caméra commune aux enfants */
.card {
  transform-style: preserve-3d;       /* conserve la profondeur des enfants */
  transition: transform 400ms ease;
}
.card:hover { transform: rotateY(25deg) translateZ(20px); }
```

`perspective` sur le **parent** crée une scène partagée (les éléments se déforment
de façon cohérente) ; `perspective()` comme **fonction** dans `transform`
s'applique à un seul élément. `backface-visibility: hidden` cache la face arrière
d'un élément retourné, indispensable pour les cartes à deux faces.

## Pourquoi les transforms ne déclenchent pas de reflow

C'est l'argument perf décisif et la raison pour laquelle on anime `transform`
plutôt que `top`/`left`/`width`.

:::compare
::bad
```css
/* agrandir via width/height : la boîte change, les voisins se réorganisent */
.thumb { transition: width 200ms ease, height 200ms ease; }
.thumb:hover { width: 180px; height: 180px; }
```
::
::good
```css
/* agrandir via scale : la boîte de layout ne bouge pas */
.thumb { transition: transform 200ms ease; }
.thumb:hover { transform: scale(1.5); }
```
::
:::

**Pourquoi.** Modifier `width`/`height` change la **boîte de l'élément dans le
flux** : le navigateur doit refaire le **layout** (calculer où vont tous les
éléments affectés), puis le **paint**, puis la **composition** — le pipeline
complet, sur le thread principal, à chaque frame. `transform` saute les deux
premières étapes : la boîte de layout reste **figée à sa taille d'origine** (c'est
pourquoi les voisins ne bougent pas), et la transformation n'est qu'une opération
matricielle appliquée à la **couche de composition** déjà rasterisée. Cette texture
est confiée au **GPU**, qui sait translater, tourner et redimensionner une image
quasi gratuitement. Aucun reflow, aucun repaint : juste de la recomposition. C'est
exactement ce qui permet de tenir 60 fps là où animer la géométrie sature le CPU.
Note l'envers du décor : comme `scale` agit sur la texture, agrandir fortement un
élément peut le rendre flou tant qu'il n'est pas re-rasterisé.
