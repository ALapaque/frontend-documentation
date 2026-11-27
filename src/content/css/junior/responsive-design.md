---
title: "Responsive design : media queries et mobile-first"
slug: "responsive-design"
framework: "css"
level: "junior"
order: 5
duration: 16
prerequisites: ["units"]
updated: 2026-11-27
seoTitle: "CSS responsive — media queries, mobile-first et points de rupture"
seoDescription: "La balise meta viewport, le mobile-first, la syntaxe @media (width >= 48rem) et des points de rupture choisis par le contenu, en rem. Le fluide avant le conditionnel, hover et prefers-*, et un aperçu des écrans pliables."
ogVariant: "sage"
related:
  - { framework: "css", slug: "units" }
  - { framework: "css", slug: "grid" }
  - { framework: "css", slug: "container-queries" }
  - { framework: "css", slug: "dark-mode" }
---

Une affiche a une taille : on la compose une fois, au millimètre. Une page web n'en a
aucune. Elle s'ouvre sur un téléphone de 360 px de large, sur un écran de bureau de
2 560 px, sur une tablette qu'on fait pivoter — et, depuis octobre 2026, sur un
iPhone pliable dont le viewport va de 382 à 951 px selon la façon dont on le tient.

Pense à de l'eau : versée dans un verre, un bol ou une carafe, elle prend la forme du
récipient. Le **responsive design** consiste à écrire une mise en page liquide, puis à
poser quelques **media queries** pour dire : « à partir de telle largeur, change de
forme ». Dans cet ordre : le fluide d'abord, les conditions ensuite.

## Le point de départ : meta viewport et mobile-first

### La balise meta viewport

Une ligne de HTML conditionne tout le reste. Elle va dans le `<head>` de chaque page :

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Sans elle, un navigateur mobile suppose que ta page a été pensée pour un écran de
bureau : il la dessine sur un viewport fictif d'environ 980 px, puis dézoome pour tout
faire tenir. Le texte devient minuscule, et tes media queries mesurent 980 px au lieu
des 390 px réels. `width=device-width` signifie « le viewport a la largeur de
l'appareil », `initial-scale=1` « aucun zoom au chargement ».

:::callout{type="warn"}
N'ajoute ni `user-scalable=no` ni `maximum-scale=1` : tu retirerais le zoom par
pincement aux personnes qui en ont besoin pour lire.
:::

### Mobile-first : du petit vers le grand

Le **mobile-first** est une façon d'ordonner ton CSS. Les styles de base, hors de toute
media query, décrivent le plus petit écran. Chaque media query **ajoute** ensuite ce
que la place supplémentaire permet.

:::compare
::bad
```css
/* desktop-first : on pose la mise en page large, puis on la défait */
.page {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: 2rem;
}
@media (max-width: 767px) {
  .page { display: block; }             /* annule la grille */
  .sidebar { margin-bottom: 1.5rem; }   /* compense le gap perdu */
}
```
::
::good
```css
/* mobile-first : une colonne par défaut, on enrichit quand il y a la place */
.page {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 48rem) {
  .page {
    grid-template-columns: 16rem 1fr;
    gap: 2rem;
  }
}
```
::
:::

**Pourquoi.** Le flux normal du HTML est déjà une mise en page mobile : des blocs
empilés, en pleine largeur. En partant de là, chaque palier **ajoute** une capacité au
lieu d'en **annuler** une. Tu écris moins de CSS, un petit écran n'applique que les
règles simples, et si une media query saute, il reste une page lisible. En
desktop-first, chaque palier passe son temps à défaire le précédent.

L'ordre d'écriture compte : une media query n'ajoute **aucune spécificité**. À
spécificité égale, la dernière règle écrite gagne, comme partout dans la
[cascade](/css/junior/selectors). Écris donc tes paliers du plus étroit au plus large.

## La syntaxe de `@media`

Une media query est un « si » posé autour d'un paquet de règles. Le navigateur
réévalue la condition en continu : fenêtre redimensionnée, téléphone pivoté, zoom.
Entre parenthèses, tu écris une **caractéristique** (*media feature*) et une valeur.
Les plus courantes : `width` et `height`, les dimensions du viewport, et
`orientation`, qui vaut `portrait` quand il est plus haut que large, `landscape`
sinon. Sans parenthèses, c'est un **type de média** : `@media print` vise l'impression.

### La syntaxe à intervalle

Historiquement, on compare avec les préfixes `min-` et `max-`. La syntaxe à intervalle
(*range syntax*) emploie les opérateurs que tu connais déjà :

```css
/* préfixes : la forme historique */
@media (min-width: 48rem) and (max-width: 63.99rem) {
  .grille { grid-template-columns: 1fr 1fr; }
}

/* intervalle : la même condition, lisible comme en maths */
@media (48rem <= width < 64rem) {
  .grille { grid-template-columns: 1fr 1fr; }
}
```

`min-width: 48rem` et `width >= 48rem` sont équivalents. Mais `min-` et `max-` sont
toujours **inclusifs** : à 64rem pile, `max-width: 64rem` et `min-width: 64rem` sont
vrais tous les deux, d'où le `63.99rem` bricolé pour éviter le chevauchement. Avec `<`
et `>=`, la frontière est nette. La syntaxe à intervalle est *Baseline widely
available* depuis le 27 septembre 2025, c'est-à-dire présente dans tous les grands
navigateurs depuis 30 mois : dans un nouveau projet, utilise-la sans hésiter.

### Combiner des conditions

```css
@media (width >= 48rem) and (orientation: landscape) { /* les deux à la fois */ }
@media (width < 30rem), (orientation: portrait)      { /* l'une ou l'autre */ }
@media (width < 30rem) or (orientation: portrait)    { /* pareil, avec le mot-clé */ }
@media not (width >= 48rem)                          { /* tout sauf ce cas */ }
```

La virgule est la forme historique du « ou » ; le mot-clé `or` dit la même chose. Tu
ne peux pas mélanger `and` et `or` au même niveau : groupe avec des parenthèses, comme
dans `(width >= 48rem) and ((hover: hover) or (pointer: fine))`.

## Choisir ses points de rupture

Un **point de rupture** (*breakpoint*) est la largeur à laquelle ta mise en page
change. Le mauvais réflexe : recopier `320 / 768 / 1024`, hérités du premier iPhone et
du premier iPad. Il n'existe plus de « largeur mobile » : l'iPhone Duo, à lui seul,
donne à Safari un viewport de 382 à 951 px selon qu'il est fermé, ouvert, tourné ou
partagé entre deux fenêtres. WebKit en tire la seule conclusion tenable : des mises en
page qui tiennent à toutes les tailles, sans chercher à détecter l'appareil.

Laisse donc le **contenu** décider :

1. Affiche ta page en version étroite, puis élargis lentement la fenêtre.
2. Dès que quelque chose cloche (lignes trop longues, vide béant, cartes étirées), tu
   tiens un point de rupture.
3. Note la largeur, convertis-la en `rem`, écris la media query. Deux ou trois paliers
   suffisent à la plupart des pages.

```css
/* des seuils nés du contenu, commentés par ce qu'ils déclenchent */
@media (width >= 40rem) {
  .articles { grid-template-columns: 1fr 1fr; }
}
@media (width >= 64rem) {
  .page { grid-template-columns: 1fr 18rem; } /* la sidebar passe à côté */
}
```

**Pourquoi en `rem`.** Dans une media query, `rem` ne dépend pas de ton CSS : il vaut
la taille de police par défaut du navigateur, donc la préférence de l'utilisateur
(16px en général). Quelqu'un qui l'a réglée à 24px voit le palier `40rem` se déclencher
à 960px au lieu de 640px : son texte est plus gros, il garde plus longtemps la mise en
page à une colonne. C'est ce qu'il lui faut, et un seuil en `px` l'ignore.

:::callout{type="warn"}
Pas de variable CSS dans la condition : `@media (width >= var(--palier))` est invalide
et son bloc ne s'applique jamais. Répète la valeur, ou confie-la à une variable de
préprocesseur (Sass).
:::

## Fluide d'abord, conditionnel ensuite

La meilleure media query est celle que tu n'as pas eu à écrire. Beaucoup d'adaptations
sont **continues**, et CSS sait les faire sans aucun palier :

```css
.contenu { max-width: 65ch; padding-inline: clamp(1rem, 5vw, 4rem); }
.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.hero { min-height: 100svh; }
```

- `max-width` et `clamp()` plafonnent la longueur de ligne et donnent des marges qui
  respirent : c'est dans [Les unités CSS](/css/junior/units).
- `repeat(auto-fit, minmax())` ajoute une colonne dès qu'il y a la place : voir
  [Grid](/css/medior/grid).
- `flex-wrap: wrap` renvoie à la ligne ce qui ne tient plus : voir
  [Flexbox](/css/medior/flexbox).
- `svh`, `lvh` et `dvh` corrigent `100vh` sur mobile, où il se mesure barres du
  navigateur rétractées : le bas de ton bloc passe sous la barre d'adresse. `svh`
  mesure l'écran barres affichées, `lvh` barres rétractées, `dvh` suit en direct. Ces
  unités sont *Baseline widely available* depuis juin 2025.

Quand la media query reste-t-elle nécessaire ? Pose-toi une question : est-ce une
affaire de **proportions** (plus ou moins de colonnes, un texte plus ou moins grand) ou
de **structure** (la sidebar change de côté, le menu devient un bouton, un bloc
disparaît) ? Les proportions se règlent en fluide. Un changement de structure à
l'échelle de la page demande un palier, donc une media query.

## Au-delà de la largeur : capacités et préférences

La largeur ne dit rien de la façon dont on utilise l'écran : un portable peut être
tactile, une tablette peut avoir une souris. Ne déduis jamais « petit écran, donc
doigt ». Interroge la capacité elle-même :

```css
/* survol réservé aux appareils qui savent survoler avec précision */
@media (hover: hover) and (pointer: fine) {
  .carte:hover { transform: translateY(-4px); }
}

/* pointeur imprécis (le doigt) : des cibles plus grandes */
@media (pointer: coarse) {
  .bouton { min-height: 3rem; }
}

/* l'utilisateur a demandé moins d'animations dans son système */
@media (prefers-reduced-motion: reduce) {
  .carte { transition: none; }
}
```

La famille `prefers-*` lit les réglages du système : `prefers-reduced-motion`,
`prefers-contrast`, ou `prefers-color-scheme`, le point d'entrée du
[mode sombre](/css/medior/dark-mode). Ce sont des demandes de l'utilisateur :
respecte-les.

:::callout{type="info"}
Une media query regarde la **fenêtre**. Pour une carte qui doit s'adapter à la place
qu'on **lui** donne (sidebar étroite ici, grille large là), l'outil est la
[container query](/css/senior/container-queries). Le partage des rôles : media queries
pour la mise en page de la page et les préférences de l'utilisateur, container queries
pour l'intérieur d'un composant.
:::

## Écrans pliables : un aperçu

Un téléphone pliable tenu à moitié ouvert, comme un livre, présente deux demi-écrans
séparés par une pliure. Deux nouvelles familles de caractéristiques la décrivent :

```css
/* l'écran est à moitié plié, en livre ou en mini-portable */
@media (device-posture: folded) {
  .lecteur { gap: 2rem; }
}

/* deux segments côte à côte : une colonne de chaque côté de la pliure */
@media (horizontal-viewport-segments: 2) {
  .lecteur {
    display: grid;
    grid-template-columns:
      env(viewport-segment-width 0 0)
      env(viewport-segment-width 1 0);
  }
}
```

`device-posture` vaut `folded` ou `continuous` (écran à plat, grand ouvert ou refermé).
`horizontal-viewport-segments` et `vertical-viewport-segments` comptent les segments
côte à côte ou empilés ; `env(viewport-segment-width 0 0)` donne la largeur du segment
situé colonne 0, ligne 0.

:::callout{type="warn"}
**Novembre 2026 : expérimental.** Dans Safari 27.1 (23 octobre 2026, iPhone Duo), ces
deux API sont un aperçu à activer par des *feature flags*, et WebKit prévient qu'elles
peuvent encore changer. Chrome et Edge les livrent (`device-posture` depuis la version
132, les viewport segments depuis la 138), Firefox non : rien de tout cela n'est
Baseline. Traite-les en amélioration progressive, jamais comme une condition pour que
la page soit lisible.
:::

Un navigateur qui ne connaît pas la condition ignore simplement le bloc. Et un écran
pliable reste d'abord un écran dont la largeur change : ta mise en page fluide fait
déjà l'essentiel du travail.

## À retenir

:::cheatsheet
- title: "meta viewport"
  desc: "`width=device-width, initial-scale=1` dans le `<head>` : sans elle, le mobile simule environ 980 px et dézoome."
- title: "Mobile-first"
  desc: "Styles de base pour le petit écran, puis `min-width` ou `width >=` par ordre croissant pour ajouter."
- title: "@media (width >= 48rem)"
  desc: "Syntaxe à intervalle, Baseline. `and`, la virgule ou `or`, et `not` pour combiner."
- title: "Points de rupture"
  desc: "Là où le contenu casse, en `rem`, deux ou trois suffisent. Jamais la taille d'un appareil précis."
- title: "Fluide d'abord"
  desc: "`clamp()`, `auto-fit` + `minmax()`, `flex-wrap`, `svh`/`dvh` ; la media query pour les changements de structure."
- title: "Pas que la largeur"
  desc: "`hover`, `pointer` et `prefers-*` pour les capacités et les préférences ; container queries pour les composants."
:::
