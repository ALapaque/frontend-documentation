---
title: "Fonctions CSS et mixins"
slug: "functions-mixins"
framework: "css"
level: "senior"
order: 11
duration: 14
prerequisites: ["custom-properties"]
updated: 2026-07-09
seoTitle: "CSS @function, if() et mixins — la logique arrive nativement dans CSS"
seoDescription: "CSS gagne de vraies fonctions personnalisées avec @function et result, la conditionnelle inline if(), et une proposition de mixins. Ce qui remplace une partie de Sass nativement, et ce qui reste au stade de proposition en 2026."
ogVariant: "gold"
related:
  - { framework: "css", slug: "custom-properties" }
  - { framework: "css", slug: "css-2026" }
---

Une custom property **stocke** une valeur, mais ne **calcule pas de logique** :
elle ne prend pas de paramètre, ne fait pas de branchement, ne factorise pas un
bloc de déclarations. Pour ça, on gardait Sass — ses fonctions, ses mixins, ses
conditions. CSS rapatrie aujourd'hui une partie de cette logique **nativement**,
avec un avantage que Sass ne pourra jamais avoir : c'est **dynamique au runtime**.
Là où Sass est figé à la compilation, une `@function` CSS réagit aux variables,
aux media queries et aux container queries pendant que la page vit.

Cet article approfondit les `@function` et les mixins. Pour le panorama 2026
complet (avec `if()`, `sibling-index()`, masonry…), voir
[l'horizon 2026](/css/next/css-2026).

## `@function` : de vraies fonctions dans CSS

`@function` déclare un **calcul paramétré et réutilisable**. On la nomme avec un
double tiret, on lui passe des paramètres, et on l'appelle comme une fonction CSS
normale.

```css
@function --fluid(--min, --max) {
  result: clamp(var(--min), 4vw + 1rem, var(--max));
}

h1 { font-size: --fluid(1.5rem, 3rem); }
p  { font-size: --fluid(1rem, 1.25rem); }
```

Le cœur, c'est le **descriptor `result`** : il porte la valeur que la fonction
renvoie. Attention au réflexe JavaScript — **CSS n'utilise pas `@return`**. Le
corps d'une `@function` s'évalue **du début à la fin**, et si plusieurs `result`
apparaissent, c'est le **dernier dans l'ordre source** qui gagne. Il n'y a pas de
sortie anticipée : `result` décrit la valeur finale, il n'interrompt rien.

### Paramètres typés et valeurs par défaut

On peut **typer** un paramètre (`<length>`, `<number>`, `<color>`…) et déclarer le
**type de retour** avec `returns`. Le type sert au moteur à valider l'entrée et la
sortie avant le rendu : un argument invalide bascule sur la valeur par défaut plutôt
que de casser la déclaration.

```css
@function --space(--step <number>: 1) returns <length> {
  result: calc(0.5rem * pow(1.5, var(--step)));
}

.stack   { gap: --space(); }    /* défaut : --step = 1 → 0.75rem */
.stack-l { gap: --space(3); }   /* 0.5rem * 1.5^3 ≈ 1.69rem     */
```

La valeur par défaut suit le deux-points (`--step <number>: 1`) et doit être valide
pour le type annoncé. Elle s'applique quand l'argument est absent ou invalide. Une
seule fonction remplace ainsi toute une échelle d'espacement écrite à la main.

## Runtime vs Sass : la différence qui change tout

C'est LE point qui distingue `@function` d'une fonction Sass. Sass calcule **au
build** : le résultat est gravé dans le CSS livré, il ne « sait » plus rien du
navigateur. `@function` calcule **à l'exécution**, donc elle voit les custom
properties, les media queries et les container queries au moment où elles changent.

:::compare
::bad
```scss
// Sass — figé à la compilation
@function fluid($min, $max) {
  @return clamp(#{$min}, 4vw + 1rem, #{$max});
}
h1 { font-size: fluid(1.5rem, 3rem); }
// les valeurs sont aplaties dans le CSS final.
// impossible de réagir à une custom property ou à une container query au runtime.
```
::
::good
```css
/* CSS @function — évaluée à l'exécution */
@function --fluid(--min <length>, --max <length>) returns <length> {
  result: clamp(var(--min), 4vw + 1rem, var(--max));
}
:root { --h1-min: 1.5rem; --h1-max: 3rem; }
@media (min-width: 60rem) { :root { --h1-max: 4rem; } }

h1 { font-size: --fluid(var(--h1-min), var(--h1-max)); }
/* --h1-max change avec la media query → --fluid() se recalcule seule */
```
::
:::

**Pourquoi c'est décisif.** Passer une custom property à une `@function` la rend
**vivante** : redéfinir `--h1-max` dans une media query, un container query ou un
`[data-theme]` suffit à réexécuter le calcul, sans recompilation ni JavaScript. Une
fonction Sass, elle, a rendu son verdict au build — le navigateur ne reçoit que le
`clamp()` final, sans mémoire des paramètres.

:::callout{type="tip"}
Combine `@function` avec `@property` (voir [custom properties](/css/custom-properties)) :
en typant tes variables d'entrée, tu obtiens des fonctions robustes qui refusent
proprement les valeurs invalides au lieu de propager une erreur silencieuse.
:::

## `if()` : la conditionnelle en ligne

Une `@function` calcule une valeur ; `if()` en **choisit** une selon une condition,
directement dans la propriété. La syntaxe est une liste de paires `condition: valeur`
terminée par `else`.

```css
.badge {
  color: if(style(--ton: danger): white; else: black);
}
```

`if()` gère trois types de conditions : `style()` (sur une custom property),
`media()` et `supports()`. C'est le complément naturel de `@function` : l'une
produit la valeur, l'autre arbitre entre plusieurs. On approfondit `if()` — cas
d'usage et pièges — dans [l'horizon 2026](/css/next/css-2026) ; retiens ici qu'elle
vit dans la même vague « logique native » que `@function`.

## Mixins : `@mixin` et `@apply`, encore une proposition

Là où une fonction renvoie **une valeur**, un **mixin** réutilise **un bloc de
déclarations** entier. C'est le rôle historique des mixins Sass, et la proposition
CSS (module *Functions and Mixins*) reprend l'idée avec `@mixin` pour définir le
bloc et `@apply` pour l'injecter.

```css
/* PROPOSITION — pas encore dans les navigateurs stables en 2026 */
@mixin --card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.1);
}

.panel {
  @apply --card;
  background: Canvas;
}
```

:::callout{type="warn"}
**Sois clair là-dessus : les mixins ne sont PAS implémentés.** `@mixin`, `@apply`
(ainsi que `@contents` et `@env`) forment un brouillon récent, encore instable et
truffé de TODO côté spécification. Aucun navigateur stable ne les gère en 2026 —
seul Chrome Canary permet d'expérimenter, derrière un flag `CSSMixins`. À traiter
comme un aperçu de recherche, pas comme un outil de production.
:::

Le manque à combler est réel : aujourd'hui, factoriser un bloc réutilisable passe
encore par une classe utilitaire, un `@extend` Sass, ou la duplication. Les mixins
natifs y répondront — mais **plus tard**.

## Ce que ça change pour Sass

CSS ne rend pas Sass inutile ; il en **rapatrie la couche dynamique**, celle qui
gagnait à vivre au runtime. Le partage se dessine ainsi.

Ce que tu peux commencer à **retirer** :

- les fonctions Sass de **calcul de valeur** (typographie fluide, échelles) →
  `@function`, avec le bonus d'être dynamique ;
- les **valeurs conditionnelles** (`@if` sur un thème, une densité) → `if()` ;
- à terme, les **mixins simples** sans logique de génération → `@mixin`/`@apply`.

Ce qui **reste** à Sass (manipulation **à la compilation**) :

- les **boucles** `@each` / `@for` qui **génèrent** de nombreuses règles (une classe
  par couleur, une par pas de grille) — CSS n'itère pas pour produire des sélecteurs ;
- la **manipulation de couleurs et de chaînes** au build, les partials et `@use`
  pour l'**organisation** du code source ;
- tout ce qui doit exister **avant** que le navigateur ne reçoive le CSS.

La ligne de partage est nette : **calculer une valeur en réagissant au contexte**,
c'est désormais le travail du CSS ; **générer du code à l'avance**, ça reste celui du
préprocesseur.

## Statut 2026, sans enjoliver

- **`@function`** : implémenté dans **Chrome et Edge 139+**, Chromium uniquement.
  Ni Firefox ni Safari ne le gèrent encore. Utilisable en production **avec
  dégradation**.
- **`if()`** : **Chrome 137+**, Chromium uniquement ; Firefox en cours
  d'implémentation, Safari sur la feuille de route. Même prudence.
- **`@mixin` / `@apply`** : **proposition**, non implémentée en stable. Uniquement
  en expérimentation derrière un flag dans Chrome Canary. **Ne rien poser dessus.**

La dégradation la plus simple pour `@function` (et `if()`) : déclarer d'abord une
valeur statique, puis la version fonction. Un navigateur qui ne comprend pas
`--fluid()` ignore la seconde déclaration et garde la première.

```css
h1 {
  font-size: clamp(1.5rem, 4vw + 1rem, 3rem); /* fallback partout            */
  font-size: --fluid(1.5rem, 3rem);           /* remplace là où c'est géré   */
}
```

:::callout{type="info"}
Pas besoin de `@supports` ici : le mécanisme de **déclaration invalide ignorée**
fait le travail. Le moteur applique la dernière valeur qu'il sait interpréter. Garde
`@supports` pour les cas où le fallback et la version moderne ne peuvent pas coexister
sur la même propriété.
:::

## À retenir

CSS gagne une **couche de logique dynamique** : `@function` factorise un calcul
paramétré, `if()` arbitre entre valeurs, et — plus tard — `@mixin` factorisera des
blocs. L'atout sur Sass n'est pas de « remplacer » mais d'être **évalué au runtime** :
tes fonctions réagissent aux variables et aux queries en direct. En 2026,
`@function` et `if()` sont réels mais Chromium-only (dégrade proprement) ; les mixins
restent une **proposition** à ne pas mettre en production.

:::cheatsheet
- title: "@function --f(--a) { result: … }"
  desc: "Déclare une fonction. `result` = valeur renvoyée. Pas de `@return` : le corps s'évalue en entier, le dernier `result` gagne."
- title: "--a <length>: 1rem"
  desc: "Paramètre typé avec valeur par défaut. Un argument invalide bascule sur le défaut."
- title: "returns <length>"
  desc: "Type de retour, validé par le moteur avant le rendu."
- title: "Runtime vs Sass"
  desc: "`@function` réagit aux custom properties, media et container queries. Sass est figé au build."
- title: "if(style(--x: v): a; else: b)"
  desc: "Choisit une valeur selon `style()`, `media()` ou `supports()`. Détaillé dans css-2026."
- title: "@mixin --m { … } / @apply --m"
  desc: "Réutilise un bloc de déclarations. PROPOSITION, non implémentée en stable (Canary + flag)."
- title: "Statut 2026"
  desc: "@function + if() : Chromium only. Mixins : proposition. Dégrade avec une valeur statique posée avant."
:::
