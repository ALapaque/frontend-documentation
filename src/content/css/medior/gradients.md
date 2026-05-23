---
title: "Dégradés"
slug: "gradients"
framework: "css"
level: "medior"
order: 6
duration: 14
prerequisites: ["colors"]
updated: 2026-05-23
seoTitle: "CSS Dégradés — linear, radial, conic et interpolation oklch"
seoDescription: "Maîtriser linear-gradient, radial-gradient et conic-gradient : angles, color stops, hard stops, répétitions, interpolation in oklch, et pourquoi un dégradé n'est pas une image."
ogVariant: "gold"
related:
  - { framework: "css", slug: "grid" }
---

## Une image générée par le moteur

Un dégradé n'est pas une couleur : c'est une **`<image>`** calculée par le
navigateur. Tu l'écris donc partout où une image est attendue — `background-image`,
`border-image`, `mask-image` — jamais dans `background-color`. Le moteur interpole
les pixels à la volée, à n'importe quelle résolution, sans jamais toucher le réseau.

Joue avec les arrêts de couleur et l'angle ci-dessous pour voir l'interpolation se recalculer en direct.

:::demo{kind="gradient"}
:::

## `linear-gradient` : angle et color stops

La syntaxe part d'une **direction** (un angle ou un mot-clé `to ...`) suivie d'une
liste de **color stops**. Chaque stop est une couleur, optionnellement suivie d'une
position. `0deg` pointe vers le haut, `90deg` vers la droite ; `to right` équivaut à
`90deg`. Entre deux stops, la couleur est interpolée linéairement.

```css
.hero {
  /* du bleu en haut au violet en bas, transition douce */
  background-image: linear-gradient(180deg, #2563eb, #7c3aed);
}
.bar {
  /* deux positions identiques = "hard stop" : changement net, pas de fondu */
  background-image: linear-gradient(90deg, #16a34a 0% 50%, #dc2626 50% 100%);
}
```

Un **hard stop** s'obtient en plaçant deux stops à la **même position** : l'interpolation
n'a aucune distance pour s'opérer, la transition devient une frontière franche. C'est
la base des rayures, des barres de progression segmentées et des damiers.

## `radial-gradient` : forme, taille, position

Le dégradé radial rayonne depuis un centre. Tu contrôles trois choses avant la liste
de stops : la **forme** (`circle` ou `ellipse`), la **taille** (mot-clé comme
`closest-side`, `farthest-corner`, ou des longueurs explicites) et la **position**
via `at`.

```css
.spot {
  /* cercle centré qui s'arrête au bord le plus proche */
  background-image: radial-gradient(circle closest-side at 30% 40%, #fde047, transparent);
}
```

Par défaut la forme est une ellipse dont la taille atteint `farthest-corner` : elle
épouse le rectangle de l'élément. Fixer `circle` et une taille explicite te donne un
spot prévisible quelle que soit la largeur de la boîte.

## `conic-gradient` : pie charts et anneaux

Le dégradé conique balaie les couleurs **autour** d'un centre, comme l'aiguille d'une
horloge. `from <angle>` fixe le point de départ de la rotation, `at <position>` le
centre. Comme les stops se mesurent en angles ou en pourcentages du tour complet, c'est
l'outil naturel des camemberts.

```css
.pie {
  /* trois parts nettes grâce aux hard stops angulaires */
  background-image: conic-gradient(
    #2563eb 0deg 120deg,
    #16a34a 120deg 200deg,
    #f59e0b 200deg 360deg
  );
  border-radius: 50%;
}
```

Pour un **anneau** (donut), combine un `conic-gradient` avec un `mask` radial, ou
superpose un `radial-gradient` qui repunche le centre en `transparent`.

## Répétitions

Les variantes `repeating-linear-gradient`, `repeating-radial-gradient` et
`repeating-conic-gradient` rejouent le motif défini par tes stops jusqu'à remplir la
boîte. La période de répétition est la distance (ou l'angle) entre le **premier** et le
**dernier** stop que tu déclares.

```css
.stripes {
  /* rayures de 20px qui se répètent à l'infini */
  background-image: repeating-linear-gradient(
    45deg,
    #1e293b 0 10px,
    #334155 10px 20px
  );
}
```

## Interpolation dans un espace couleur

Par défaut, l'interpolation se fait en **sRGB**, ce qui traverse souvent une zone grise
ou désaturée entre deux teintes vives. Depuis 2024, tu peux choisir l'espace
d'interpolation avec `in <espace>` : `in oklch` garde une luminosité et une chroma
perçues constantes, et les teintes tournent proprement sur la roue chromatique.

:::compare
::bad
```css
/* sRGB par défaut : le passage bleu → jaune vire au gris boueux au milieu */
.swatch {
  background-image: linear-gradient(90deg, blue, yellow);
}
```
::
::good
```css
/* oklch : la teinte tourne, la luminosité reste régulière, pas de zone morte */
.swatch {
  background-image: linear-gradient(in oklch, blue, yellow);
}
```
::
:::

**Pourquoi.** En sRGB, l'interpolation est linéaire sur les canaux R, G, B. Mélanger du
bleu pur (faible R/G) et du jaune (fort R/G) fait passer la moyenne par des valeurs où
les trois canaux sont proches : un gris désaturé. OKLCH sépare luminosité (`L`), chroma
(`C`) et teinte (`H`) : interpoler `H` fait tourner la couleur le long de la roue sans
jamais s'effondrer vers le centre achromatique, donc aucune zone terne.

## Le piège du banding

Sur un dégradé long et peu contrasté, l'œil perçoit des **bandes** : ce sont les marches
d'escalier entre deux valeurs voisines de la rampe 8 bits. Le moteur ne dispose que de
256 niveaux par canal ; étalés sur 1000px, certaines marches deviennent visibles.

:::callout{type="tip"}
Pour casser le banding sans passer en 10 bits : superpose un bruit très léger
(`background-blend-mode` avec un PNG de noise, ou un `mask` à grain fin), ou réduis la
distance sur laquelle le dégradé s'étale. Un dégradé court bande beaucoup moins qu'un
dégradé plein écran.
:::

## Pourquoi un dégradé n'est pas une image

:::cheatsheet
- title: "Zéro requête"
  desc: "Aucun fichier à télécharger : le coût réseau est nul."
- title: "Résolution infinie"
  desc: "Recalculé par pixel, net sur tout écran y compris Retina."
- title: "Vectoriel et fluide"
  desc: "Se redimensionne avec la boîte sans flou ni artefact JPEG."
- title: "Coût GPU"
  desc: "Un grand dégradé animé reste un repaint : à surveiller en perf."
:::

Un PNG dégradé pèse des kilo-octets, déclenche une requête HTTP et se pixelise sur
écran haute densité. Le dégradé CSS est du **code** : il voyage dans la feuille de style
déjà chargée, s'adapte à toute taille et reste parfaitement net. Le seul vrai coût est le
*painting* : un immense dégradé conique animé en plein écran peut saturer le GPU, mais
pour un fond statique c'est gratuit comparé à une image.
