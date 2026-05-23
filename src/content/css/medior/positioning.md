---
title: "Le positionnement CSS"
slug: "positioning"
framework: "css"
level: "medior"
order: 3
duration: 14
prerequisites: ["box-model"]
updated: 2026-05-23
seoTitle: "CSS position — relative, absolute, fixed, sticky, z-index"
seoDescription: "Flux normal vs hors-flux, le bloc englobant qui décide où se cale un absolute, z-index et le piège des contextes d'empilement, expliqués par la mécanique."
ogVariant: "gold"
related:
  - { framework: "css", slug: "box-model" }
---

## Cinq valeurs, une seule question : par rapport à quoi ?

La propriété `position` répond à une seule question : **par rapport à quoi** un
élément se place, et **reste-t-il dans le flux** des autres ? Le flux normal, c'est
l'empilement par défaut où chaque boîte pousse la suivante. Selon la valeur de
`position`, l'élément reste dans ce flux, en sort partiellement, ou en sort
complètement — et c'est cette sortie qui crée 90 % des surprises de layout.

Change la valeur de `position` et les décalages ci-dessous pour voir l'élément
quitter le flux et se recaler sur des références différentes.

:::demo{kind="positioning"}
:::

:::cheatsheet
- title: "static"
  desc: "Le défaut. Dans le flux. `top/left/z-index` n'ont aucun effet."
- title: "relative"
  desc: "Dans le flux (garde sa place), mais décalé visuellement par `top/left`. Devient référence pour les enfants `absolute`."
- title: "absolute"
  desc: "Hors du flux. Se cale sur le plus proche ancêtre positionné."
- title: "fixed"
  desc: "Hors du flux. Se cale sur le viewport, ignore le scroll (sauf transform parent)."
- title: "sticky"
  desc: "Dans le flux, puis se fige à un seuil de scroll dans son conteneur."
:::

## Dans le flux ou hors du flux

`static` et `relative` **gardent leur place** dans le flux : les voisins se
comportent comme si l'élément n'avait pas bougé. Avec `relative`, le décalage
`top/left` est purement visuel — l'espace d'origine reste réservé, ce qui peut
créer un « trou » ou un chevauchement.

`absolute` et `fixed`, eux, **retirent l'élément du flux** : les voisins se
referment comme s'il n'existait plus. C'est exactement pour ça qu'on les utilise
(badges, menus, overlays), mais c'est aussi le piège : un parent qui n'avait que
des enfants en `absolute` s'effondre à une hauteur nulle, faute de contenu pour le
remplir.

:::callout{type="warn"}
Un conteneur dont tous les enfants sont `absolute` a une hauteur de `0`. Si tu vois
un parent « disparaître » ou se collapser, vérifie que ses enfants sont bien encore
dans le flux, ou donne-lui une hauteur explicite.
:::

## Le bloc englobant : par rapport à qui se cale un `absolute`

C'est le point central, et le plus mal compris. Un élément `absolute` ne se
positionne **pas** par rapport à son parent direct, mais par rapport à son **bloc
englobant** (*containing block*) : le **plus proche ancêtre dont `position` est
autre que `static`**. S'il n'en existe aucun, il remonte jusqu'au bloc initial (le
viewport).

:::compare
::bad
```css
.carte {
  /* position: static (défaut) → n'est PAS un bloc englobant */
}
.carte .badge {
  position: absolute;
  top: 0;
  right: 0;
  /* se cale sur le viewport, pas sur la carte : le badge fuit en haut de page */
}
```
::
::good
```css
.carte {
  position: relative; /* devient le bloc englobant des enfants absolute */
}
.carte .badge {
  position: absolute;
  top: 0;
  right: 0;
  /* se cale dans le coin de la carte, comme attendu */
}
```
::
:::

**Pourquoi.** Le navigateur résout `top/right/bottom/left` d'un `absolute` en
remontant l'arbre à la recherche du premier ancêtre **positionné**. Tant qu'il n'en
trouve pas, il prend le viewport comme référence. Le `position: relative` sur la
carte ne la déplace pas (aucun `top/left`), mais il la **promeut en bloc
englobant** : c'est l'idiome `relative` parent / `absolute` enfant. À noter qu'une
`transform`, un `filter` ou `will-change` non triviaux créent **aussi** un bloc
englobant — c'est pourquoi un `fixed` peut soudain se caler sur un parent
transformé au lieu du viewport, un bug classique des modales dans une carte animée.

## `sticky` : hybride flux / figé

`sticky` reste dans le flux et défile normalement, **jusqu'à** atteindre le seuil
que tu fixes (`top`, `bottom`...) ; il se fige alors à ce seuil tant que son
conteneur parent est visible à l'écran.

```css
.entete-section {
  position: sticky;
  top: 0; /* se colle en haut une fois atteint, puis repart avec son conteneur */
}
```

:::callout{type="info"}
Un `sticky` ne « colle » que dans les limites de son **parent direct**. S'il ne
bouge jamais, la cause habituelle est un ancêtre avec `overflow: hidden`/`auto`/`scroll`
qui découpe le contexte de scroll, ou un parent trop court : `sticky` ne peut pas
dépasser la zone de son conteneur.
:::

## `z-index` et les contextes d'empilement

`z-index` ordonne les éléments sur l'axe de profondeur — mais **uniquement** sur
les éléments positionnés (`position` autre que `static`), et **uniquement à
l'intérieur d'un même contexte d'empilement** (*stacking context*). C'est cette
seconde règle qui piège tout le monde.

:::compare
::bad
```css
.modale {
  position: fixed;
  z-index: 9999; /* « énorme », donc forcément au-dessus de tout ? Non. */
}
.barre {
  position: relative;
  z-index: 10;
  opacity: 0.99; /* crée un contexte d'empilement isolé */
}
/* La modale, enfant de .barre, plafonne au z-index de .barre face au reste. */
```
::
::good
```css
.modale {
  position: fixed;
  z-index: 9999;
}
/* La modale est rendue à la racine du DOM (ex : portail / <dialog>),
   hors de tout contexte d'empilement parent : son z-index compte vraiment. */
```
::
:::

**Pourquoi.** Un `z-index` ne se compare qu'entre frères d'un **même** contexte
d'empilement. Or des propriétés courantes en créent un nouveau, isolé :
`opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`, ou un
élément positionné avec un `z-index` numérique. Dès qu'un parent forme un contexte,
tous ses descendants sont **enfermés** dedans : leur `z-index`, même `9999`, ne se
compare qu'aux autres enfants, jamais à un élément situé hors de ce parent. La
solution n'est pas de gonfler le chiffre — c'est de **sortir** l'élément du contexte
fautif : le rendre à la racine via un portail ou l'élément natif `<dialog>`, qui
vit dans la *top layer* au-dessus de toute la page, hors de la hiérarchie des
contextes d'empilement.

:::callout{type="tip"}
Avant d'augmenter un `z-index`, ouvre l'inspecteur et cherche un ancêtre avec
`transform`, `opacity` ou `filter`. Neuf fois sur dix, le vrai coupable est un
contexte d'empilement parent, pas une valeur trop basse. Préfère `isolation: isolate`
pour créer un contexte volontairement, plutôt que de surenchérir sur les chiffres.
:::
