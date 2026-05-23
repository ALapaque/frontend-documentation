---
title: "Les couleurs en CSS"
slug: "colors"
framework: "css"
level: "junior"
order: 4
duration: 13
prerequisites: []
updated: 2026-05-23
seoTitle: "CSS — Couleurs hex, rgb, hsl, oklch et color-mix()"
seoDescription: "Des notations classiques aux espaces perceptuels : pourquoi oklch garde une luminosité cohérente, color-mix(), la transparence et currentColor expliqués."
ogVariant: "sage"
related:
  - { framework: "css", slug: "box-model" }
---

## Une couleur, plusieurs façons de l'écrire

Une couleur à l'écran est toujours un mélange de rouge, vert et bleu. Les notations
historiques décrivent ce mélange directement : `#ff8800` (hexadécimal) et
`rgb(255 136 0)` désignent **exactement la même** couleur, l'une en base 16,
l'autre en base 10. `hsl()` change de point de vue : au lieu des canaux RVB, il
décrit teinte, saturation et luminosité — plus intuitif pour un humain qui veut
« la même couleur, mais plus claire ».

Change la teinte, la luminosité et le mélange ci-dessous pour comparer les
notations sur une même couleur.

:::demo{kind="colors"}
:::

:::cheatsheet
- title: "#rrggbb"
  desc: "Hexadécimal. `#f80` est la forme courte de `#ff8800`. Compact, dominant dans les maquettes."
- title: "rgb(r g b / a)"
  desc: "Canaux 0–255 + alpha optionnel. Syntaxe moderne sans virgules."
- title: "hsl(h s% l% / a)"
  desc: "Teinte (0–360°), saturation, luminosité. Pratique pour dériver des variantes."
- title: "oklch(l c h / a)"
  desc: "Espace perceptuel. Luminosité, chroma, teinte alignés sur l'œil humain."
- title: "color-mix()"
  desc: "Mélange deux couleurs dans un espace donné. Génère des nuances à la volée."
:::

## Le problème de `hsl` : la luminosité ment

`hsl()` semble idéal pour générer une palette : on garde `s` et `l`, on fait
varier la teinte `h`. En théorie toutes les couleurs ont « la même clarté ». En
pratique, non — et c'est très visible.

:::compare
::bad
```css
/* Même L=50%, teintes différentes : le jaune paraît bien plus clair
   que le bleu, alors que la valeur est identique. */
.jaune { background: hsl(90 100% 50%); }
.bleu  { background: hsl(250 100% 50%); }
```
::
::good
```css
/* Même L=0.65 en oklch : jaune et bleu ont la MÊME clarté perçue. */
.jaune { background: oklch(0.65 0.18 90); }
.bleu  { background: oklch(0.65 0.18 250); }
```
::
:::

**Pourquoi.** Le `l` de `hsl()` est un calcul purement mathématique sur les canaux
RVB, qui ne tient pas compte de la sensibilité de l'œil. Or notre vision est
beaucoup plus sensible au vert et au jaune qu'au bleu : à valeur numérique égale,
le jaune nous éblouit et le bleu paraît sombre. Une palette `hsl` à `l` constant
produit donc des couleurs qui « sautent » en clarté. `oklch()` est construit sur un
modèle **perceptuel** : son axe `l` correspond à la luminosité *ressentie*. Deux
couleurs au même `l` paraissent réellement aussi claires l'une que l'autre — ce qui
rend les palettes, les états de survol et les contrastes prévisibles.

## `oklch()` en détail

`oklch(L C H / alpha)` : `L` est la luminosité perçue (0 = noir, 1 = blanc), `C` le
chroma (l'intensité, 0 = gris), `H` la teinte en degrés. C'est aujourd'hui l'espace
recommandé pour définir des design tokens.

```css
:root {
  --brand:       oklch(0.62 0.19 264);
  /* survol : on assombrit en baissant SEULEMENT L, teinte intacte */
  --brand-hover: oklch(0.55 0.19 264);
}
```

:::callout{type="tip"}
Pour générer une variante plus sombre/claire d'une couleur de marque, ne touche
qu'au `L`. En `hex` ou `hsl`, assombrir change aussi la teinte perçue ; en `oklch`,
la teinte reste identique tant que tu ne touches pas `H`.
:::

## `color-mix()` : composer sans figer des valeurs

`color-mix()` calcule un mélange entre deux couleurs, dans l'espace que tu choisis.
Combiné aux variables CSS, il dérive toute une gamme à partir d'**une seule** couleur
source.

```css
.btn {
  background: var(--brand);
}
.btn:hover {
  /* 85% de la marque + 15% de noir → version assombrie, calculée en oklch */
  background: color-mix(in oklch, var(--brand) 85%, black);
}
.btn--subtle {
  /* teinte pâle pour un fond : la marque diluée dans du blanc */
  background: color-mix(in oklch, var(--brand) 12%, white);
}
```

**Pourquoi.** Mélanger « dans » un espace change le résultat : `in oklch`
interpole de façon perceptuellement linéaire et évite les zones grisâtres ou
sursaturées qu'un mélange `in srgb` traverse parfois entre deux teintes éloignées.
En centralisant `--brand`, un seul changement de couleur source met à jour le
hover, les fonds doux et les bordures dérivées — plus de constantes hexadécimales
éparpillées à resynchroniser à la main.

## Transparence et `currentColor`

L'alpha (`/ 0.5`) rend une couleur partiellement transparente : ce qui est derrière
transparaît, contrairement à une couleur claire opaque qui masque le fond.

```css
.overlay { background: oklch(0 0 0 / 0.6); } /* voile noir à 60% */
```

`currentColor` est un mot-clé qui vaut la valeur **calculée** de `color` sur
l'élément. Il sert à lier une bordure ou une icône à la couleur du texte sans
répéter la valeur.

:::compare
::bad
```css
.tag {
  color: oklch(0.55 0.18 264);
  border: 1px solid oklch(0.55 0.18 264); /* dupliqué, à resynchroniser */
}
```
::
::good
```css
.tag {
  color: oklch(0.55 0.18 264);
  border: 1px solid currentColor; /* suit toujours la couleur du texte */
}
```
::
:::

**Pourquoi.** `currentColor` n'est pas une copie figée : c'est une référence vivante
à la propriété `color` héritée ou définie sur l'élément. Si tu changes `color` (au
survol, dans un thème, via une classe d'état), la bordure et toute icône SVG en
`fill: currentColor` suivent **automatiquement**. Tu décris une relation (« la
bordure, c'est la couleur du texte ») au lieu de dupliquer une valeur que rien ne
garantira d'aligner plus tard.
