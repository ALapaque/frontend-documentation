---
title: "corner-shape : au-delà de border-radius"
slug: "corner-shape"
framework: "css"
level: "senior"
order: 9
duration: 12
prerequisites: ["custom-properties"]
updated: 2026-07-09
seoTitle: "CSS corner-shape — squircles, biseaux et encoches sans SVG ni clip-path"
seoDescription: "corner-shape étend border-radius : squircle (superellipse), bevel, scoop, notch. Des coins qui ne sont plus forcément des arcs de cercle, animables et fidèles au design iOS, sans clip-path ni images."
ogVariant: "gold"
related:
  - { framework: "css", slug: "custom-properties" }
  - { framework: "css", slug: "gradients" }
---

`border-radius` n'offre qu'une seule forme de coin : l'arc de cercle. Tout le reste —
les squircles d'iOS, les biseaux à 45°, les encoches d'un ticket de cinéma — passait
par `clip-path`, du SVG ou une image de fond. Trois techniques qui découpent la boîte
au lieu de la dessiner : non animables entre deux formes, indifférentes à l'ombre et
à la bordure, coûteuses à maintenir. `corner-shape` généralise le coin. Il ne remplace
pas `border-radius` : il décide de la **forme** de la courbe que `border-radius`
dimensionne.

## Taille contre forme : les deux se combinent

Retiens la division du travail : `border-radius` fixe la **taille** du coin (le rayon,
en px, %, ou deux valeurs pour un coin elliptique) ; `corner-shape` fixe sa **forme**
(arc, biseau, creux, encoche). L'un ne va pas sans l'autre.

```css
.card {
  border-radius: 24px;      /* la taille du coin */
  corner-shape: squircle;   /* la forme du coin */
}
```

:::callout{type="warn"}
`corner-shape` **n'a aucun effet** si `border-radius` vaut `0` ou n'est pas défini.
Sans rayon, il n'y a pas de coin à sculpter. C'est la première chose à vérifier quand
rien ne se passe : la forme a besoin d'une taille sur laquelle s'appliquer.
:::

**Pourquoi ce découplage.** Un coin, c'est une transition entre deux arêtes sur une
certaine distance. `border-radius` décrit cette distance ; il l'a toujours fait. Ce
qui manquait, c'était le contrôle de la **trajectoire** entre les deux arêtes. En
séparant les deux, on garde toute la mécanique de `border-radius` (par angle, en
logique inline/block, animable) et on lui ajoute un axe orthogonal.

## Le catalogue des formes

Cinq mots-clés couvrent les cas courants, et une fonction ouvre le continuum complet.

```css
corner-shape: round;     /* défaut : l'arc de cercle habituel */
corner-shape: bevel;     /* coin coupé net, une diagonale */
corner-shape: scoop;     /* creux concave, mordu vers l'intérieur */
corner-shape: notch;     /* encoche rectangulaire, angle rentrant */
corner-shape: squircle;  /* le carré arrondi d'iOS, plus plein que round */
corner-shape: square;    /* coin franc : annule visuellement le rayon */
```

Ces mots ne sont pas six cas isolés : ce sont des points sur une même courbe
mathématique, la **superellipse**. La fonction `superellipse(<number>)` donne accès à
l'ensemble, où le nombre est l'exposant de courbure :

```css
corner-shape: superellipse(2);        /* = squircle */
corner-shape: superellipse(1);        /* = round   */
corner-shape: superellipse(0);        /* = bevel   */
corner-shape: superellipse(-1);       /* = scoop   */
corner-shape: superellipse(-1.6);     /* creux intermédiaire, sur mesure */
corner-shape: superellipse(infinity); /* = square  */
```

**Comment lire l'exposant.** Au-dessus de `1`, le coin **bombe** vers l'extérieur (le
squircle est plus « plein » qu'un arc de cercle). À `1`, c'est le quart de cercle
exact. À `0`, la courbe devient une droite : le biseau. En dessous de `0`, elle se
**creuse** vers l'intérieur, jusqu'à l'encoche à angle droit quand l'exposant tend vers
`-infinity`. Les mots-clés ne sont que des raccourcis nommés vers ces valeurs.

:::callout{type="tip"}
Le squircle mérite son mot-clé dédié. C'est la forme des icônes iOS et des cartes
Apple : un arrondi qui n'a **pas** de rupture de courbure là où le coin rejoint le
bord droit, contrairement à un arc de cercle. Avant `corner-shape`, le reproduire
fidèlement exigeait un SVG calculé. Ici, c'est un mot.
:::

## Un coin par angle

Comme `border-radius`, `corner-shape` se décline par angle. Les longhands physiques :
`corner-top-left-shape`, `corner-top-right-shape`, `corner-bottom-right-shape`,
`corner-bottom-left-shape` (plus les variantes logiques `corner-start-start-shape`,
etc., et les raccourcis de côté `corner-top-shape`). Le raccourci `corner-shape`
accepte de 1 à 4 valeurs, dans le sens horaire à partir du haut-gauche.

```css
/* un onglet : arrondi en haut, franc en bas */
.tab {
  border-radius: 12px;
  corner-shape: round round square square;
}

/* un ticket : encoches sur les deux côtés */
.ticket {
  border-radius: 16px;
  corner-shape: scoop; /* toutes les valeurs, puis on affine si besoin */
  corner-left-shape: notch;
}
```

C'est là que les formes asymétriques deviennent triviales : onglets, badges, tickets
perforés, bulles de dialogue avec un seul coin pointu. Auparavant, chacune demandait
son propre `clip-path` ou son image.

## Ça s'anime, et proprement

L'argument décisif face à `clip-path`. Une transition entre deux `clip-path` n'est
fluide **que** si les deux polygones ont le même nombre de points, dans le même ordre.
Passer d'un rectangle arrondi à une encoche, ou d'un cercle à une étoile, ne
s'interpole pas : le navigateur saute d'un état à l'autre.

:::compare
::bad
```css
/* clip-path : les deux formes n'ont pas la même structure,
   la transition ne s'interpole pas — saut brutal ou rien */
.chip {
  clip-path: inset(0 round 8px);
  transition: clip-path 0.2s;
}
.chip:hover {
  clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
}
```
::
::good
```css
/* corner-shape + border-radius vivent sur un continuum :
   le moteur interpole l'exposant, la forme se déforme en douceur */
.chip {
  border-radius: 8px;
  corner-shape: round;
  transition: corner-shape 0.2s, border-radius 0.2s;
}
.chip:hover {
  corner-shape: bevel; /* round → bevel = superellipse(1) → superellipse(0) */
}
```
::
:::

**Pourquoi ça marche.** Chaque forme est un point sur l'axe de la superellipse. Animer
de `round` vers `bevel`, c'est faire glisser l'exposant de `1` à `0` — une valeur
numérique continue, donc interpolable image par image. Le moteur n'a pas à faire
correspondre des sommets comme avec un polygone ; il déplace un curseur. `border-radius`
étant déjà animable, la taille et la forme évoluent ensemble sans à-coup.

## L'ombre, la bordure et le fond suivent la forme

Différence de nature avec `clip-path`, qui **découpe** : `corner-shape` **redéfinit**
la géométrie de la boîte. Tout ce qui épouse le contour de l'élément suit la nouvelle
forme — `background`, `border`, `outline`, `box-shadow`, `overflow` et
`backdrop-filter`.

```css
.badge {
  border-radius: 20px;
  corner-shape: scoop;
  border: 2px solid var(--accent); /* la bordure épouse le creux */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25); /* l'ombre aussi */
}
```

**Pourquoi c'est important.** Avec `clip-path`, l'ombre portée est rognée par le
découpage : soit elle disparaît, soit il faut la refaire à la main avec un
`drop-shadow` sur un filtre. Une bordure, elle, ne suit pas du tout la découpe. Avec
`corner-shape`, le contour reste le **vrai** bord de l'élément : la bordure le longe,
l'ombre en dérive, le contenu débordant est masqué selon la forme. On dessine une
boîte, on n'en cache pas des morceaux.

## Statut 2026 et dégradation

Sois honnête sur la maturité : en juillet 2026, `corner-shape` est **émergent**. Il
n'est disponible que dans les navigateurs Chromium (Chrome d'abord), autour de 67 % du
parc, et n'est pas encore Baseline — la spec vit dans le module CSS Borders and Box
Decorations Level 4. Ce n'est pas un acquis multi-navigateurs.

La bonne nouvelle : la dégradation est **gratuite**. Un navigateur qui ignore
`corner-shape` conserve `border-radius` et affiche des coins arrondis classiques. Tant
que `round` reste un repli acceptable, on peut poser `corner-shape` dès aujourd'hui
sans filet.

```css
.card {
  border-radius: 24px; /* repli universel : coins arrondis partout */
  corner-shape: squircle; /* amélioration là où c'est géré */
}
```

Quand la forme **porte** le design (une encoche de ticket, un biseau structurant qui
ne doit pas devenir un arrondi), teste explicitement le support et prévois une
alternative visible.

```css
@supports (corner-shape: notch) {
  .ticket { corner-shape: notch; }
}
/* sinon, un autre repli que le simple round : bordure en tirets,
   pseudo-élément, ou on assume les coins arrondis */
```

:::callout{type="info"}
Traite `corner-shape` comme une **amélioration progressive**, pas comme un socle.
La règle : la maquette doit rester correcte avec des coins `round`. Si elle ne l'est
pas, c'est que la forme est fonctionnelle, et il faut alors un repli réel derrière
`@supports`, pas juste l'espoir que tout le monde soit sur Chromium.
:::

## À retenir

`corner-shape` ajoute à `border-radius` l'axe qui lui manquait : la forme du coin, pas
seulement sa taille. Squircle fidèle à iOS, biseaux, creux et encoches deviennent des
mots-clés animables, avec ombre et bordure qui suivent, sans SVG ni `clip-path`. Le prix
à payer en 2026 : un support Chromium d'abord, à traiter en amélioration progressive.

:::cheatsheet
- title: "Rôles"
  desc: "`border-radius` = taille du coin ; `corner-shape` = forme. Les deux se combinent."
- title: "Prérequis"
  desc: "Sans `border-radius` non nul, `corner-shape` n'a aucun effet."
- title: "Valeurs"
  desc: "`round` (défaut), `bevel`, `scoop`, `notch`, `squircle`, `square`."
- title: "superellipse(n)"
  desc: "Le continuum : 2=squircle, 1=round, 0=bevel, -1=scoop, ±infinity=notch/square."
- title: "Par angle"
  desc: "`corner-top-left-shape`… ou 1 à 4 valeurs dans le raccourci (sens horaire)."
- title: "Animable"
  desc: "Interpole l'exposant, contrairement à `clip-path` entre formes différentes."
- title: "Contour fidèle"
  desc: "`border`, `box-shadow`, `outline`, `overflow` épousent la forme au lieu d'être coupés."
- title: "Statut 2026"
  desc: "Émergent, Chromium d'abord, non Baseline. Repli `round` gratuit ; `@supports` si la forme est fonctionnelle."
:::
