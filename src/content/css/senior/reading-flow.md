---
title: "reading-flow : l'ordre de tabulation maîtrisé"
slug: "reading-flow"
framework: "css"
level: "senior"
order: 10
duration: 13
prerequisites: ["subgrid"]
updated: 2026-07-09
seoTitle: "CSS reading-flow et reading-order — réaccorder l'ordre du focus à l'ordre visuel"
seoDescription: "Quand order et grid-auto-flow désynchronisent l'ordre visuel de l'ordre du DOM, la tabulation part dans tous les sens. reading-flow et reading-order réalignent l'ordre du focus sur ce que l'œil voit, sans toucher au HTML."
ogVariant: "gold"
related:
  - { framework: "css", slug: "flexbox" }
  - { framework: "web", slug: "accessibility" }
---

En flexbox, `order` réarrange **visuellement** les éléments ; en grid, le placement
explicite ou `grid-auto-flow: dense` fait pareil. Mais la tabulation clavier, elle,
suit toujours l'**ordre du DOM**. Résultat : l'œil lit une rangée de gauche à droite
`1-2-3`, et le focus, lui, saute `3-1-2`. C'est un bug d'accessibilité classique — un
utilisateur au clavier ou au lecteur d'écran perd le fil. `reading-flow` réaccorde
l'ordre du focus sur l'ordre **visuel**, sans toucher à une seule ligne de HTML.

## Le bug : l'œil lit 1-2-3, le clavier tabule 3-1-2

Prends trois liens dans une rangée flex, réordonnés avec `order`. Le HTML est écrit
dans un ordre, `order` en impose un autre à l'écran — et le focus reste collé au DOM.

```html
<nav class="row">
  <a href="#c">3</a>
  <a href="#a">1</a>
  <a href="#b">2</a>
</nav>
```

:::compare
::bad
```css
.row { display: flex; }
.row a:nth-child(1) { order: 3; } /* le "3" file à droite */
.row a:nth-child(2) { order: 1; } /* le "1" passe à gauche */
.row a:nth-child(3) { order: 2; } /* le "2" au milieu */
/* Visuel : 1 2 3 — Tabulation : 3 1 2 (l'ordre du DOM) */
```
::
::good
```css
.row {
  display: flex;
  reading-flow: flex-visual; /* le focus suit ce que l'œil voit : 1 2 3 */
}
.row a:nth-child(1) { order: 3; }
.row a:nth-child(2) { order: 1; }
.row a:nth-child(3) { order: 2; }
```
::
:::

**Pourquoi c'est un vrai bug.** Le critère WCAG 2.4.3 *Focus Order* exige que l'ordre
de navigation préserve le **sens** et l'**opérabilité**. Un focus qui saute de façon
illogique casse cette garantie : la personne ne peut pas prévoir où le curseur ira
ensuite. Historiquement, `order` et le placement grid n'ont jamais réordonné le focus —
`reading-flow` corrige enfin le décalage.

## `reading-flow` sur le conteneur

La propriété se pose sur le **conteneur** flex, grid ou bloc, et décide selon quel
critère l'ordre de focus/lecture de ses enfants directs est recalculé.

```css
.grid {
  display: grid;
  reading-flow: grid-rows; /* focus rangée par rangée, dans l'ordre visuel */
}
```

- **`normal`** — comportement par défaut : l'ordre suit le DOM, `order` et le placement
  n'ont aucun effet sur le focus.
- **`flex-visual`** — sur un conteneur flex : l'ordre suit le rendu visuel des items, en
  tenant compte du `writing-mode` (donc de la direction du texte).
- **`flex-flow`** — sur un conteneur flex : l'ordre suit la direction du `flex-flow`
  (l'axe principal et son sens), et non la position pixel des items.
- **`grid-rows`** — sur une grille : l'ordre parcourt les items **rangée par rangée**,
  dans leur ordre visuel.
- **`grid-columns`** — sur une grille : l'ordre parcourt les items **colonne par
  colonne**.
- **`grid-order`** — sur une grille : si `order` est appliqué aux enfants, le focus suit
  cet ordre modifié ; sinon, se comporte comme `normal`.
- **`source-order`** — sur flex, grid ou bloc : n'agit pas seul, mais **active** la
  possibilité d'ajuster l'ordre enfant par enfant via `reading-order` (voir plus bas).

:::callout{type="info"}
`reading-flow` ne réordonne que les **enfants directs** du conteneur, exactement comme
`order` ou le placement grid. La hiérarchie profonde n'est pas mélangée : chaque niveau
gère son propre flux de lecture.
:::

## `reading-order` : le réglage fin par élément

`reading-flow` recolle globalement focus et visuel. Pour ajuster **un item précis** dans
ce flux, `reading-order: <integer>` se pose sur l'enfant — même logique que `order`, mais
appliquée à l'ordre de lecture. Une valeur plus basse est lue en premier ; à valeur
égale, l'ordre visuel départage.

```css
.toolbar {
  display: flex;
  reading-flow: source-order; /* on active l'ajustement manuel */
}
.toolbar .primary { reading-order: -1; } /* ce bouton est focalisé en premier */
.toolbar .help    { reading-order: 1; }  /* et celui-ci en dernier */
```

:::callout{type="tip"}
`reading-order` n'a d'effet que dans un conteneur dont `reading-flow` vaut autre chose que
`normal`. Sur `source-order`, c'est **lui** qui pilote tout l'ordre ; sur `flex-visual` ou
`grid-rows`, il sert de retouche ponctuelle par-dessus l'ordre visuel calculé.
:::

## Le POURQUOI : focus et lecture, jamais le rendu

Le point à intégrer une fois pour toutes : `reading-flow` **n'affecte pas le rendu**. Les
boîtes ne bougent pas d'un pixel — c'est toujours `order`, `flex-direction` et le
placement grid qui décident de la position à l'écran. Ce que la propriété change, c'est
uniquement :

- l'ordre de **tabulation** au clavier (`Tab` / `Maj+Tab`) ;
- l'ordre de **lecture** annoncé par les technologies d'assistance en navigation
  séquentielle.

Autrement dit, le **HTML reste la source de vérité sémantique**. La CSS ne fait que
réaligner deux ordres qui n'auraient jamais dû diverger : ce que l'œil voit et ce que le
focus parcourt. On ne réécrit pas la structure du document, on répare une désynchronisation
introduite par la mise en page.

## Limite : recoller focus et visuel, pas maquiller un mauvais HTML

C'est la frontière à ne pas franchir. `reading-flow` sert à **réconcilier** le focus avec
un ordre visuel légitime (issu d'un `order` ou d'un `grid-auto-flow: dense` posés pour le
responsive ou la densité) — pas à rattraper un ordre de DOM incorrect au départ.

:::callout{type="warn"}
Si l'ordre de tabulation « logique » ne correspond **ni** au DOM **ni** au visuel, le
problème est dans ton HTML : l'ordre sémantique est faux, et c'est le balisage qu'il faut
corriger. La propriété présuppose que le rendu visuel est la bonne cible ; elle ne fabrique
pas un ordre qui n'existe nulle part.
:::

## Support 2026 et dégradation

`reading-flow` et `reading-order` ont débarqué dans **Chrome 137** (Chromium d'abord),
mi-2025. En juillet 2026, le support reste **partiel** : Chromium l'expose, Firefox et
Safari sont encore en cours d'implémentation. C'est donc une amélioration progressive,
pas encore une base universelle.

La bonne nouvelle : la dégradation est **gracieuse par nature**. Un navigateur qui ne
connaît pas `reading-flow` l'ignore et retombe sur `normal` — le focus suit le DOM, comme
avant. Aucun `@supports` obligatoire, aucun risque de régression. Corollaire : pour une
accessibilité solide **aujourd'hui**, garde un ordre de DOM déjà cohérent avec le sens.
`reading-flow` est le raffinement qui recolle focus et visuel là où il est reconnu, pas un
substitut à un HTML bien ordonné.

## À retenir

`order` et le placement grid déplacent les pixels sans toucher au focus, d'où un ordre de
tabulation qui contredit l'œil — une violation directe de *Focus Order* (WCAG 2.4.3).
`reading-flow` sur le conteneur réaligne l'ordre de focus et de lecture sur l'ordre
visuel ; `reading-order` affine item par item. Ça n'agit **que** sur focus et lecture, pas
sur le rendu : le HTML garde son rôle de source de vérité. À réserver au recollage
focus↔visuel, jamais au maquillage d'un mauvais ordre de départ.

:::cheatsheet
- title: "reading-flow: flex-visual"
  desc: "Conteneur flex : le focus suit le rendu visuel des items (writing-mode inclus)."
- title: "reading-flow: flex-flow"
  desc: "Conteneur flex : le focus suit la direction du flex-flow, pas la position pixel."
- title: "reading-flow: grid-rows / grid-columns"
  desc: "Grille : focus rangée par rangée, ou colonne par colonne, dans l'ordre visuel."
- title: "reading-flow: grid-order"
  desc: "Grille : suit l'ordre modifié par `order` sur les enfants ; sinon comme normal."
- title: "reading-flow: source-order"
  desc: "Flex/grid/bloc : active l'ajustement manuel via reading-order sur les enfants."
- title: "reading-order: <n>"
  desc: "Sur un enfant : ajuste sa place dans le flux ; plus bas = lu en premier."
- title: "N'affecte que focus et lecture"
  desc: "Le rendu ne bouge pas ; le HTML reste la source de vérité sémantique."
- title: "Support 2026"
  desc: "Chromium (dès Chrome 137) ; retombe sur `normal` ailleurs — dégradation sûre."
:::
