---
title: "Sélecteurs & cascade"
slug: "selectors"
framework: "css"
level: "junior"
order: 1
duration: 14
prerequisites: []
updated: 2026-05-23
seoTitle: "CSS — Sélecteurs, spécificité et cascade"
seoDescription: "Types de sélecteurs, combinateurs, calcul de la spécificité (a-b-c), ordre de la cascade, :is()/:where() et pourquoi fuir !important."
ogVariant: "sage"
related:
  - { framework: "css", slug: "box-model" }
---

## Cibler un élément, c'est répondre à « lequel »

Une règle CSS est un couple : un **sélecteur** qui désigne des éléments, et un
bloc de déclarations. Tout le sujet, c'est de viser juste — ni trop large (tu
repeins la page entière), ni trop précis (tu n'arrives plus à surcharger).

:::cheatsheet
- title: "type"
  desc: "`p`, `button` — cible par nom de balise."
- title: "classe"
  desc: "`.card` — l'outil par défaut, réutilisable et de faible spécificité."
- title: "id"
  desc: "`#main` — unique par page, très spécifique : à éviter pour styler."
- title: "attribut"
  desc: "`[type=\"email\"]`, `[data-state=\"open\"]` — cible selon un attribut."
- title: "pseudo-classe"
  desc: "`:hover`, `:focus-visible`, `:nth-child(2)` — un état ou une position."
- title: "pseudo-élément"
  desc: "`::before`, `::marker` — une sous-partie générée de l'élément."
:::

## Les combinateurs : relations entre éléments

Les combinateurs expriment une **relation** dans l'arbre, pas un élément seul.

```css
.menu a {        /* descendant : tout a quelque part dans .menu */ }
.menu > a {      /* enfant direct : a fils immédiat de .menu */ }
h2 + p {         /* frère adjacent : le p juste après un h2 */ }
h2 ~ p {         /* frères suivants : tous les p après un h2 */ }
```

Le combinateur enfant `>` est souvent ce que tu veux vraiment : il borne la
portée et évite que des éléments imbriqués profondément héritent d'un style.

## La spécificité : un score, pas une opinion

Quand deux règles s'appliquent au même élément, le navigateur ne choisit pas « la
plus jolie » : il compare un score à trois colonnes **a-b-c**.

:::cheatsheet
- title: "a"
  desc: "Nombre d'**id** (`#x`)."
- title: "b"
  desc: "Nombre de **classes**, attributs et pseudo-classes (`.x`, `[x]`, `:hover`)."
- title: "c"
  desc: "Nombre de **types** et pseudo-éléments (`div`, `::before`)."
:::

On compare colonne par colonne, de gauche à droite. Un seul id (1-0-0) bat
n'importe quel nombre de classes (0-99-0) : les colonnes ne se « reportent »
jamais comme des dizaines.

```css
#sidebar .item        /* a=1 b=1 c=0  → 1-1-0 */
.nav .menu a:hover    /* a=0 b=3 c=1  → 0-3-1 */
ul li a               /* a=0 b=0 c=3  → 0-0-3 */
```

:::callout{type="info"}
À spécificité **égale**, c'est l'**ordre source** qui tranche : la dernière règle
écrite gagne. C'est pour ça que l'ordre de tes fichiers et de tes imports compte.
:::

## La cascade, dans l'ordre réel

La spécificité n'est qu'une étape. Le navigateur résout un conflit dans cet
ordre, du plus fort au plus faible : origine et importance (`!important` auteur >
styles auteur normaux > styles navigateur), puis **layers** (`@layer`), puis la
spécificité, puis l'ordre d'apparition. La spécificité n'intervient donc qu'une
fois les questions d'origine et de calque tranchées.

## `:is()` et `:where()` : factoriser sans gonfler le score

Ces deux pseudo-classes prennent une liste de sélecteurs et matchent si l'un
d'eux correspond. Elles évitent la répétition. La différence est cruciale :
`:is()` prend la spécificité de son argument **le plus spécifique**, tandis que
`:where()` a une spécificité de **0** — toujours.

```css
/* identiques en ciblage, opposés en spécificité */
:is(h1, h2, h3) a   /* spécificité = celle de h1 a → 0-0-2 */
:where(h1, h2, h3) a /* spécificité = 0-0-1 (le a seul), le :where ne compte pas */
```

`:where()` est l'outil idéal pour des styles de base que l'utilisateur surchargera
facilement : tu poses un défaut sans créer de dette de spécificité.

## Pourquoi fuir `!important`

:::compare
::bad
```css
.alert {
  color: red !important;
}
/* ailleurs, impossible à corriger proprement : */
.alert.alert--muted {
  color: gray; /* ignoré */
}
```
::
::good
```css
@layer components {
  .alert { color: red; }
}
@layer overrides {
  .alert--muted { color: gray; } /* gagne par le calque, pas par la force */
}
```
::
:::

**Pourquoi.** `!important` ne « monte pas la spécificité » : il saute dans une
couche d'importance supérieure qui court-circuite tout le calcul a-b-c normal.
Pour le surcharger, il faut un autre `!important` au moins aussi spécifique —
tu déclenches une escalade. Les `@layer` règlent le même besoin (« ce style doit
gagner ») par l'**ordre des calques** : une règle d'un calque déclaré plus tard
bat celle d'un calque antérieur, quelle que soit sa spécificité, sans jamais
toucher au levier d'urgence qu'est `!important`.

:::callout{type="warn"}
La seule exception légitime à `!important` : neutraliser un style inline ou une
feuille tierce que tu ne contrôles pas. Dans ton propre code, c'est presque
toujours le signe d'une architecture de cascade à revoir.
:::
