---
title: "Container queries"
slug: "container-queries"
framework: "css"
level: "senior"
order: 2
duration: 15
prerequisites: ["custom-properties"]
updated: 2026-05-23
seoTitle: "CSS — Container queries, container-type et unités cqi"
seoDescription: "container-type: inline-size, @container, unités cqi/cqw, composants responsive indépendants du viewport, et le piège du container-type mal placé."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "custom-properties" }
---

## Répondre à son conteneur, pas à la fenêtre

Une media query interroge le **viewport** : « combien fait l'écran ? ». Une
container query interroge le **conteneur parent** d'un composant : « combien
d'espace m'a-t-on donné, ici, maintenant ? ». C'est un changement de référentiel
décisif pour des composants réutilisables : la même carte peut vivre dans une
sidebar de 280px ou dans une grille pleine largeur, et s'adapter à *sa* place
réelle sans rien savoir de la taille de l'écran.

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card; /* optionnel mais recommandé */
}

@container card (min-width: 24rem) {
  .card {
    display: grid;
    grid-template-columns: 8rem 1fr; /* vignette + texte côte à côte */
  }
}
```

On déclare un **conteneur de requête** avec `container-type`, puis on interroge sa
largeur avec `@container`. La règle `@container` cible les descendants du
conteneur, jamais le conteneur lui-même.

:::cheatsheet
- title: "container-type"
  desc: "`inline-size` = mesure la largeur. `size` = largeur + hauteur. `normal` = aucun."
- title: "container-name"
  desc: "Nomme le conteneur pour viser `@container <nom> (...)` sans ambiguïté."
- title: "container"
  desc: "Shorthand : `container: card / inline-size`."
- title: "@container"
  desc: "Requête sur le plus proche conteneur ancêtre du bon type."
- title: "cqi / cqw"
  desc: "1% de la largeur (inline) du conteneur de requête. `cqb`/`cqh` pour le bloc."
:::

## `inline-size` plutôt que `size`, presque toujours

`container-type` crée du **containment** : pour mesurer le conteneur de façon
fiable, le navigateur isole sa taille de son contenu. C'est précisément là qu'est
le piège le plus courant.

:::compare
::bad
```css
/* containment sur les DEUX axes : la hauteur du conteneur
   ne dépend plus de son contenu → il s'effondre à 0 de haut */
.card-wrapper {
  container-type: size;
}
```
::
::good
```css
/* containment sur l'axe inline seulement : la hauteur
   reste dictée par le contenu, comme un bloc normal */
.card-wrapper {
  container-type: inline-size;
}
```
::
:::

**Pourquoi.** `container-type: size` applique un **size containment** sur les deux
axes : le navigateur cesse de laisser le contenu déterminer la taille du conteneur,
sur la largeur *et* la hauteur. Or la hauteur d'un bloc est presque toujours
intrinsèque (elle vient du contenu). En la coupant, le conteneur se réduit à zéro
de haut tant que tu ne fixes pas une hauteur explicite — d'où des composants
invisibles. `inline-size` ne contraint que l'axe inline (la largeur en écriture
horizontale) : c'est l'unique dimension dont une container query a besoin dans
99% des cas, et le contenu continue de dicter la hauteur normalement.

## Le piège du conteneur : on n'interroge pas soi-même

Une container query cible les **descendants** d'un conteneur. Si tu poses
`container-type` sur l'élément que tu veux styler, `@container` cherchera un
*autre* conteneur plus haut — souvent l'inverse de ton intention.

:::compare
::bad
```css
/* le composant est SON PROPRE conteneur : la requête
   remonte au conteneur parent, pas à .card */
.card {
  container-type: inline-size;
}
@container (min-width: 24rem) {
  .card { grid-template-columns: 8rem 1fr; } /* ne réagit pas à .card */
}
```
::
::good
```css
/* un wrapper porte le containment, .card est interrogée à l'intérieur */
.card-wrapper { container-type: inline-size; }
@container (min-width: 24rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
```
::
:::

**Pourquoi.** La résolution d'une `@container` part de l'élément ciblé et **remonte**
l'arbre jusqu'au premier ancêtre dont le `container-type` correspond — un élément
n'est jamais son propre conteneur de requête. Mettre `container-type` directement
sur `.card` signifie donc « `.card` est un conteneur *pour ses enfants* », et la
règle qui vise `.card` ira chercher la largeur du grand-parent. Le motif fiable est
toujours une enveloppe dédiée : un wrapper porte la mesure, le composant la
consomme.

## Les unités de conteneur : `cqi`, `cqw` et compagnie

Comme `vw` est relatif au viewport, les unités `cq*` sont relatives au conteneur de
requête. `1cqi` = 1% de la taille inline du conteneur. Elles permettent une
typographie fluide qui suit la place réelle du composant, sans aucune requête.

```css
.card-wrapper { container-type: inline-size; }
.card h3 {
  /* grandit avec le conteneur, borné pour rester lisible */
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

`cqi` (inline) et `cqb` (block) suivent le sens d'écriture ; `cqw`/`cqh` sont liées
aux axes physiques largeur/hauteur. Préfère `cqi` : il reste correct en écriture
verticale ou RTL, là où `cqw` fait des hypothèses sur l'orientation.

## Pourquoi c'est supérieur aux media queries pour un composant

:::callout{type="tip"}
Règle de partage du travail : les **media queries** décrivent la *mise en page de
page* (combien de colonnes dans le layout global, marges de la grille principale).
Les **container queries** décrivent l'*adaptation interne d'un composant*. Un
composant qui dépend du viewport est implicitement couplé à un emplacement précis ;
le même composant en container query est portable partout sans le réécrire.
:::

Le coût d'un design system fondé sur les media queries, c'est que chaque composant
suppose « je suis dans tel layout à telle largeur d'écran ». Déplace-le dans une
sidebar et ses points de rupture mentent. Avec les container queries, le composant
ne connaît que son propre espace : il devient une unité vraiment autonome, ce qui
est exactement la promesse d'un système de composants réutilisables.

:::callout{type="info"}
Les container queries sont stables dans tous les navigateurs evergreen depuis 2023.
En 2026 on peut aussi interroger le **style** d'un conteneur (`@container style(...)`)
pour réagir à la valeur d'une custom property héritée — utile pour piloter des
variantes sans multiplier les classes.
:::
