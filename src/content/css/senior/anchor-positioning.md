---
title: "Anchor positioning"
slug: "anchor-positioning"
framework: "css"
level: "senior"
order: 4
duration: 16
prerequisites: ["positioning"]
updated: 2026-05-23
seoTitle: "CSS Anchor Positioning — anchor-name, position-area et fallbacks"
seoDescription: "Positionner tooltips, menus et popovers en pur CSS : anchor-name, position-anchor, la grille 3×3 de position-area, anchor() et position-try-fallbacks anti-débordement."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "grid" }
---

## Ancrer un élément à un autre

Pendant vingt ans, coller un tooltip à son bouton imposait soit du JavaScript de
mesure (`getBoundingClientRect` + repositionnement au scroll), soit un parent
`position: relative` qui contraignait le HTML. L'**anchor positioning** balaie tout ça :
un élément déclare un nom d'ancre, un autre s'y accroche, et le moteur recalcule la
position à chaque reflow, scroll ou resize, **sans une ligne de JS**.

Déplace l'ancre dans la démo et regarde l'élément ancré la suivre tout seul.

:::demo{kind="anchor"}
:::

## `anchor-name` et `position-anchor`

Le mécanisme repose sur deux déclarations. L'élément de référence se nomme avec
`anchor-name` (un *dashed-ident*, `--quelque-chose`). L'élément à positionner doit être
en `position: absolute` ou `fixed`, et désigne son ancre via `position-anchor`.

```css
.btn {
  anchor-name: --menu-trigger;
}
.menu {
  position: absolute;
  position-anchor: --menu-trigger;
}
```

À partir de là, `.menu` connaît la géométrie de `.btn` même s'ils sont éloignés dans
l'arbre DOM. L'ancre n'a **pas** besoin d'être un ancêtre — c'est toute la différence
avec le `position: relative` traditionnel.

## `position-area` : la grille 3×3 implicite

Le moyen le plus lisible de placer l'élément ancré est `position-area`. Imagine une
grille **3×3** centrée sur l'ancre : trois bandes horizontales (`left`, `center`,
`right`) et trois verticales (`top`, `center`, `bottom`). Tu nommes une cellule (ou une
bande), et l'élément s'y loge.

```css
.tooltip {
  position: absolute;
  position-anchor: --field;
  position-area: top center;   /* juste au-dessus, centré horizontalement */
}
.dropdown {
  position-area: bottom span-right; /* sous l'ancre, débordant vers la droite */
}
```

`span-left` / `span-right` étendent l'élément sur deux cellules d'une rangée, utile pour
des menus plus larges que leur déclencheur.

## `anchor()` pour un contrôle fin

Quand la grille 3×3 ne suffit pas, la fonction `anchor()` renvoie une **coordonnée d'un
côté de l'ancre**, utilisable dans `top`, `left`, `right`, `bottom` ou même `inset`. Tu
mélanges alors anchor positioning et calc classique.

```css
.popover {
  position: absolute;
  position-anchor: --card;
  /* aligne le bord haut du popover sur le bord bas de l'ancre, + 8px d'air */
  top: calc(anchor(bottom) + 8px);
  left: anchor(left);
}
```

## `position-try-fallbacks` : anti-débordement

Un menu placé `bottom` qui sort de l'écran en bas est inutilisable. `position-try-fallbacks`
liste des **positions de repli** : si la position courante déborde du viewport, le moteur
essaie la suivante jusqu'à en trouver une qui tient. Les mots-clés `flip-block` et
`flip-inline` génèrent automatiquement le miroir.

:::compare
::bad
```css
/* Le menu déborde dès qu'il est près du bas de l'écran : coupé, inutilisable. */
.menu {
  position: absolute;
  position-anchor: --trigger;
  position-area: bottom center;
}
```
::
::good
```css
/* Si "bottom" déborde, le moteur bascule au-dessus tout seul. */
.menu {
  position: absolute;
  position-anchor: --trigger;
  position-area: bottom center;
  position-try-fallbacks: flip-block;
}
```
::
:::

**Pourquoi.** Sans fallback, la position est figée : le navigateur honore `bottom center`
même si ça sort du viewport, exactement comme un `top: 100%` en dur. Avec
`position-try-fallbacks: flip-block`, le moteur teste la position nominale, détecte le
**débordement** par rapport au bloc de confinement, puis applique automatiquement la
variante miroir sur l'axe de bloc (passe au-dessus). C'est le repositionnement intelligent
qui demandait jadis une bibliothèque comme Popper.js, désormais natif.

## Cas d'usage et lien avec la Popover API

Tooltips, menus déroulants, popovers, *date pickers* : tout ce qui flotte près d'un
déclencheur. Le compagnon naturel est la **Popover API** (`popover` + `[popovertarget]`)
qui gère l'ouverture/fermeture, la *top layer* (au-dessus de tout, hors `overflow`) et la
fermeture au clic extérieur. L'anchor positioning fournit le **où**, la Popover API le
**quand** et le **comment** afficher.

```html
<button popovertarget="info">Aide</button>
<div id="info" popover>Texte d'aide</div>
```
```css
button { anchor-name: --aide; }
[popover] {
  position-anchor: --aide;
  position-area: top center;
  position-try-fallbacks: flip-block;
}
```

## Support 2026 et dégradation

:::callout{type="warn"}
En mai 2026, l'anchor positioning est implémenté dans **Chromium 125+** (Chrome, Edge,
Opera) mais **pas encore dans Safari ni Firefox**. Une **bannière de compatibilité
s'affiche** dans la démo ci-dessus sur les navigateurs non supportés pour t'avertir que
le positionnement automatique n'y fonctionnera pas.
:::

La dégradation doit être **pensée en amont**. Sur les moteurs sans support, `position-anchor`
et `position-area` sont simplement ignorés : prévois donc un positionnement de secours
classique (un parent `position: relative` + `top`/`left`), ou détecte la fonctionnalité.

:::compare
::bad
```css
/* Aucun secours : sur Safari/Firefox le popover se colle au coin haut-gauche. */
.popover {
  position: absolute;
  position-anchor: --t;
  position-area: bottom center;
}
```
::
::good
```css
/* Secours d'abord, amélioration progressive ensuite. */
.popover { position: absolute; top: 100%; left: 0; } /* baseline */
@supports (anchor-name: --x) {
  .trigger { anchor-name: --t; }
  .popover { position-anchor: --t; position-area: bottom center; inset: auto; }
}
```
::
:::

**Pourquoi.** Quand `position-anchor` est inconnu, le navigateur l'ignore mais conserve
`position: absolute` : sans `top`/`left`, l'élément se cale sur sa position statique, donc
en haut à gauche de son bloc de confinement. Le `@supports (anchor-name: --x)` n'applique
les règles d'ancrage que là où elles existent réellement, et le `baseline` garantit un
rendu correct partout ailleurs.

:::cheatsheet
- title: "anchor-name: --x"
  desc: "Sur l'élément de référence : lui donne un nom d'ancre."
- title: "position-anchor: --x"
  desc: "Sur l'élément ancré (absolute/fixed) : le relie à l'ancre."
- title: "position-area"
  desc: "Place via la grille 3×3 : top/center/bottom × left/center/right."
- title: "anchor(side)"
  desc: "Renvoie une coordonnée d'un côté de l'ancre dans top/left/etc."
- title: "position-try-fallbacks"
  desc: "Positions de repli (flip-block/flip-inline) anti-débordement."
:::
