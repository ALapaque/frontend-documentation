---
title: "text-box-trim : rogner l'espace des lettres"
slug: "text-box-trim"
framework: "css"
level: "medior"
order: 7
duration: 12
prerequisites: ["box-model"]
updated: 2026-07-09
seoTitle: "text-box-trim et text-box-edge — aligner le texte au pixel près en CSS"
seoDescription: "Supprimer l'espace fantôme au-dessus et en dessous du texte : text-box-trim, text-box-edge et la shorthand text-box pour un rythme vertical précis, des boutons et badges parfaitement centrés, sans hacks de line-height."
ogVariant: "gold"
related:
  - { framework: "css", slug: "box-model" }
  - { framework: "css", slug: "custom-properties" }
---

## L'espace fantôme du texte

Chaque ligne de texte traîne un espace vertical invisible. Ce n'est pas un bug :
c'est la fonte. Elle définit une **em box** avec une ascendante (le haut, qui réserve
la place des accents) et une descendante (le bas, pour les `p`, `g`, `y`). Les glyphes
ne remplissent jamais toute cette boîte : il reste du vide au-dessus des capitales et
sous la ligne de base. Ajoute le **half-leading** — quand `line-height` dépasse la
hauteur des glyphes, ce surplus (le *leading*) se répartit pour moitié au-dessus, pour
moitié en dessous de chaque ligne.

Le texte n'est donc jamais collé à sa box. Centrer un libellé dans un bouton ou coller
un titre à un filet devenait un bricolage de `line-height` à `1` et de `margin` négatif
calé à l'œil, cassé au moindre changement de fonte. `text-box-trim` rogne cet espace
**proprement**, à partir des métriques réelles de la fonte.

:::callout{type="info"}
Le vide existe même avec `line-height: 1` : le *leading* n'est qu'une couche par-dessus
l'espace intrinsèque de l'ascendante et de la descendante. Baisser `line-height` ne le
supprime pas, ça le réduit — et déborde vite.
:::

## `text-box-trim` : quoi rogner

`text-box-trim` indique **quelles arêtes** de bloc rogner :

```css
.a { text-box-trim: trim-start; } /* rogne le haut (over)  */
.b { text-box-trim: trim-end; }   /* rogne le bas (under)  */
.c { text-box-trim: trim-both; }  /* rogne haut et bas     */
/* défaut : none — aucun rognage */
```

`trim-start`/`trim-end` suivent l'axe de bloc : en horizontal, `start` = haut,
`end` = bas. Seul, `text-box-trim` ne dit pas *jusqu'où* rogner — c'est le rôle de
`text-box-edge`. Les deux vont de pair.

## `text-box-edge` : sur quelle métrique rogner

`text-box-edge` choisit **la métrique de référence** du haut et du bas, sous la forme
`<haut> <bas>` :

```css
.titre {
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic; /* haut = capitales, bas = ligne de base */
}
```

- **`text`** — bord de la zone de contenu de la fonte (ascendante / descendante).
  Défaut : rien n'est rogné de plus.
- **`cap`** (haut) — jusqu'au **sommet des capitales** ; l'espace des accents disparaît.
- **`ex`** (haut) — jusqu'à la **hauteur d'x** (sommet des minuscules courtes), plus agressif.
- **`alphabetic`** (bas) — jusqu'à la **ligne de base** ; l'espace des descendantes disparaît.

Le haut accepte `text`, `cap`, `ex` ; le bas accepte `text`, `alphabetic`. La combinaison
`cap alphabetic` colle la box au bloc « majuscule → ligne de base », soit les limites que
l'œil perçoit comme réelles.

## La shorthand `text-box`

`text-box` combine les deux propriétés en une déclaration :

```css
.titre { text-box: trim-both cap alphabetic; }
/* = text-box-trim: trim-both; text-box-edge: cap alphabetic; */

.reset { text-box: normal; } /* remet à none / auto : aucun rognage */
```

Retiens `trim-both cap alphabetic` comme réglage par défaut d'un titre : il couvre
l'immense majorité des besoins.

## Cas d'usage concrets

**Centrage optique d'un bouton.** Avec un `padding` symétrique, le texte paraît décalé
vers le bas : l'espace de la descendante le pousse visuellement trop haut.

:::compare
::bad
```css
/* padding symétrique, mais le texte flotte : centrage optique raté */
.btn { padding: 12px 20px; line-height: 1.2; }
```
::
::good
```css
/* on rogne l'espace fantôme, le padding mesure alors le vrai glyphe */
.btn { padding: 12px 20px; line-height: 1.2; text-box: trim-both cap alphabetic; }
```
::
:::

**Pourquoi.** Le `padding` s'applique à la box du texte, espace fantôme compris. Rogné,
il mesure enfin la distance entre le bord du bouton et le glyphe : le centrage devient
optique, pas mathématique.

**Titre collé à un filet.** `margin-bottom: 0` laisse encore l'espace de la ligne de base.

:::compare
::bad
```css
.titre { margin: 0 0 -6px; } /* marge négative calée à l'œil, fragile */
```
::
::good
```css
.titre { margin: 0; text-box-trim: trim-end; text-box-edge: text alphabetic; }
```
::
:::

Le `-6px` cassait au changement de fonte ; la version rognée suit les métriques et
reste juste quelle que soit la police.

**Rythme vertical (baseline grid) et badges.** Sur une grille de base, l'espace au-dessus
des capitales fausse les calculs : rogner le haut sur `cap` rend l'écart prévisible. Sur
un badge minuscule, chaque pixel d'espace fantôme décentre le chiffre.

:::compare
::bad
```css
.badge { padding: 2px 8px; line-height: 1; } /* écrase tout, tronque les descendantes */
```
::
::good
```css
.badge { padding: 2px 8px; line-height: 1.4; text-box: trim-both cap alphabetic; }
```
::
:::

## Support 2026 et dégradation

`text-box`, `text-box-trim` et `text-box-edge` sont pris en charge par **Chrome/Edge 133**
(février 2025) et **Safari 18.2** (décembre 2024). **Firefox** ne les gère pas encore :
l'ensemble **n'est pas encore Baseline** début 2026.

La **dégradation est gracieuse** : un navigateur qui ignore ces propriétés affiche le texte
avec son espace fantôme habituel — rien ne casse, le contenu reste lisible. Traite le rognage
comme une **amélioration progressive**.

:::callout{type="warn"}
Ne construis pas une mise en page qui *dépend* du rognage (un chevauchement calculé au pixel) :
sur Firefox l'espace revient et l'effet saute. Réserve `text-box` au peaufinage, pas à la structure.
:::

## À retenir

Le texte n'a jamais collé à sa box à cause des métriques de fonte et du half-leading.
`text-box-trim` rogne cet espace selon les vraies limites des glyphes, sans `line-height`
bidouillé ni `margin` négatif fragile.

:::cheatsheet
- title: "text-box-trim"
  desc: "Quoi rogner : `trim-start` (haut), `trim-end` (bas), `trim-both`. Défaut `none`."
- title: "text-box-edge"
  desc: "Sur quelle métrique : `cap`/`ex`/`text` en haut, `alphabetic`/`text` en bas."
- title: "text-box (shorthand)"
  desc: "`text-box: trim-both cap alphabetic` — le réglage passe-partout d'un titre."
- title: "Centrage de bouton"
  desc: "`trim-both cap alphabetic` recentre optiquement : le `padding` mesure le vrai glyphe."
- title: "Support 2026"
  desc: "Chrome/Edge 133, Safari 18.2. Pas Firefox → pas encore Baseline."
- title: "Dégradation"
  desc: "Ignoré = espace fantôme conservé, texte lisible. À réserver au peaufinage."
:::
