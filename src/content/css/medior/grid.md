---
title: "Grid"
slug: "grid"
framework: "css"
level: "medior"
order: 2
duration: 18
prerequisites: ["flexbox"]
updated: 2026-05-23
seoTitle: "CSS Grid — modèle mental et démo interactive"
seoDescription: "Maîtriser CSS Grid : pistes, fr, repeat(), minmax(), auto-fit/auto-fill, placement par lignes — avec une démo interactive."
ogVariant: "sage"
related:
  - { framework: "css", slug: "flexbox" }
---

## Deux dimensions, des pistes

Là où flexbox gère un axe, Grid gère **lignes et colonnes en même temps**. Tu
définis des *pistes* (tracks) avec `grid-template-columns` / `-rows`, et les
enfants se logent dans les cellules. Joue avec le nombre de colonnes et les
alignements ci-dessous :

:::demo{kind="grid"}
:::

## L'unité `fr` et `repeat()`

`fr` représente une fraction de l'espace **disponible** après les tailles fixes.
`repeat()` évite la répétition manuelle.

:::cheatsheet
- title: "1fr 1fr 1fr"
  desc: "Trois colonnes égales. Équivalent à `repeat(3, 1fr)`."
- title: "repeat(3, 1fr)"
  desc: "Même chose, en plus court — indispensable au-delà de 3 pistes."
- title: "200px 1fr"
  desc: "Sidebar fixe + contenu fluide. Le grand classique du layout d'app."
- title: "minmax(0, 1fr)"
  desc: "Piste flexible qui peut rétrécir sous son contenu — anti-débordement."
:::

## Grilles responsives sans media query

La combinaison `auto-fit` + `minmax()` produit une grille qui se réorganise seule
selon la largeur disponible. Aucune media query nécessaire.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
```

Chaque carte fait au moins `240px` ; dès qu'il y a la place pour une de plus, la
grille ajoute une colonne. `auto-fill` fait pareil mais garde des colonnes vides
si le contenu ne suffit pas à les remplir.

:::callout{type="info"}
`auto-fit` *réduit* les pistes vides à zéro (les cartes existantes s'étirent),
`auto-fill` les *conserve* (les cartes gardent leur taille min, espace vide à
droite). Pour des cartes qui remplissent la ligne, c'est `auto-fit`.
:::

## Le piège : `1fr` qui déborde

Une piste `1fr` a un minimum implicite de `min-content`. Un contenu insécable
(long mot, `<pre>`, image) peut donc forcer la piste à dépasser et casser tout
le layout.

:::compare
::bad
```css
/* un long bloc de code dans une cellule fait déborder la grille entière */
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```
::
::good
```css
/* minmax(0, 1fr) autorise la piste à descendre sous son contenu */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
```
::
:::

**Pourquoi.** `1fr` est un raccourci pour `minmax(auto, 1fr)`, et `auto` en
borne minimale vaut `min-content`. La piste refuse donc de rétrécir sous la
largeur de son plus gros élément indivisible. `minmax(0, 1fr)` remet le minimum
à zéro et laisse `overflow`/`min-width` gérer le débordement proprement.

## Placement explicite

Au-delà du flux automatique, on positionne par numéros de lignes (les lignes sont
numérotées à partir de 1, pas les colonnes).

```css
.feature {
  /* de la ligne 1 à la ligne 3 → occupe deux colonnes */
  grid-column: 1 / 3;
  grid-row: 1 / 2;
}
/* ou en relatif */
.feature {
  grid-column: span 2;
}
```

Nommer les lignes (`[content-start]`) ou définir des `grid-template-areas` rend
les layouts complexes lisibles — mais commence par les pistes et le flux auto,
qui couvrent 90 % des cas.
