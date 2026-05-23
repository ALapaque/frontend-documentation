---
title: "Le box model"
slug: "box-model"
framework: "css"
level: "junior"
order: 2
duration: 13
prerequisites: ["selectors"]
updated: 2026-05-23
seoTitle: "CSS — Box model, box-sizing et margin collapse"
seoDescription: "Content, padding, border, margin, box-sizing: border-box en reset, le piège du margin collapsing, width/min/max et inline vs block."
ogVariant: "sage"
related:
  - { framework: "css", slug: "flexbox" }
---

## Tout élément est une boîte à quatre couches

De l'intérieur vers l'extérieur : le **content** (le texte, l'image), le
**padding** (l'espace interne, dans le fond), la **border** (le trait), et la
**margin** (l'espace externe, transparent, entre voisins). Le fond et la couleur
s'étendent sous le content et le padding, jamais sous la margin.

:::cheatsheet
- title: "content"
  desc: "La zone du contenu. Sa largeur dépend de `box-sizing`."
- title: "padding"
  desc: "Espace interne, peint avec le `background`. Pousse le content vers le centre."
- title: "border"
  desc: "Le trait entre padding et margin. A une épaisseur, donc occupe de la place."
- title: "margin"
  desc: "Espace externe, transparent. Sépare l'élément de ses voisins."
:::

## `box-sizing` : ce que `width` mesure vraiment

Par défaut (`content-box`), `width` mesure **seulement le content**. Si tu ajoutes
du padding ou une bordure, la boîte visible devient plus large que la valeur
annoncée — un classique des débordements de grille.

:::compare
::bad
```css
.card {
  box-sizing: content-box; /* défaut */
  width: 300px;
  padding: 20px;
  border: 2px solid;
  /* largeur réelle = 300 + 40 + 4 = 344px */
}
```
::
::good
```css
*, *::before, *::after {
  box-sizing: border-box;
}
.card {
  width: 300px;
  padding: 20px;
  border: 2px solid;
  /* largeur réelle = 300px, padding et bordure inclus */
}
```
::
:::

**Pourquoi.** En `border-box`, le navigateur résout d'abord la largeur totale
(300px) puis **soustrait** padding et bordure pour calculer le content. La taille
que tu écris est donc la taille qui s'affiche : tu raisonnes en boîtes finales, pas
en additions mentales. On le pose dans un reset global (`*`) parce que c'est le
modèle attendu dès qu'on fait du layout — sinon chaque ajout de padding casse les
calculs de largeur en cascade.

## Le piège : le margin collapsing

Deux marges **verticales** qui se touchent ne s'additionnent pas : elles
**fusionnent** et seule la plus grande survit.

```css
.bloc-a { margin-bottom: 30px; }
.bloc-b { margin-top: 20px; }
/* l'écart entre A et B est 30px, pas 50px */
```

:::callout{type="warn"}
Le collapse ne touche que les marges **verticales** dans le flux en bloc. Il ne se
produit **pas** à l'intérieur d'un conteneur `flex` ou `grid`, ni quand un padding,
une bordure ou `overflow` autre que `visible` s'intercale. C'est pourquoi un `gap`
en flex/grid est plus prévisible que des marges entre enfants.
:::

Le cas le plus déroutant est la marge qui « s'échappe » d'un parent : si un enfant
a `margin-top` et que le parent n'a ni padding ni bordure en haut, la marge de
l'enfant remonte et pousse le **parent** au lieu de creuser à l'intérieur.

## `width`, `min-width`, `max-width`

`width` fixe une taille ; les deux autres posent des **bornes** que le navigateur
respecte en priorité. L'ordre de résolution est : on calcule `width`, puis on
clampe par `max-width`, puis par `min-width` — `min-width` a donc le dernier mot.

```css
.contenu {
  width: 100%;
  max-width: 65ch;   /* ne dépasse jamais ~65 caractères, lisible */
  min-width: 0;      /* autorise à rétrécir sous sa taille intrinsèque */
}
```

`max-width: 65ch` est le patron idiomatique d'une colonne de texte : large sur
petit écran, plafonnée sur grand écran sans media query.

## `inline`, `block`, `inline-block`

:::cheatsheet
- title: "block"
  desc: "Prend toute la largeur, va à la ligne. `width`/`height`/marges verticales actifs. Ex : `div`, `p`."
- title: "inline"
  desc: "Reste dans le flux du texte. `width`/`height` et marges verticales **ignorés**. Ex : `span`, `a`."
- title: "inline-block"
  desc: "Dans le flux comme inline, mais accepte dimensions et marges verticales comme un block."
:::

Le réflexe à retenir : si tu poses `width` ou `margin-top` sur un `<span>` et que
rien ne bouge, c'est qu'il est `inline` — ces propriétés n'ont aucun effet sur une
boîte inline. Passe-le en `inline-block` (ou repense le balisage) plutôt que de
chercher un bug ailleurs.
