---
title: "Custom properties"
slug: "custom-properties"
framework: "css"
level: "senior"
order: 1
duration: 16
prerequisites: []
updated: 2026-05-23
seoTitle: "CSS — Custom properties, @property et theming"
seoDescription: "Variables CSS résolues à l'exécution, héritage en cascade vs Sass, theming par data-theme, @property pour typer et animer, et scoping."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "container-queries" }
---

## Des variables vivantes, pas des constantes de build

Une custom property se déclare avec un double tiret et se lit avec `var()`. Sa
particularité fondamentale : elle est **résolue à l'exécution** par le moteur de
style, pas remplacée au build comme une variable Sass.

```css
:root {
  --space: 8px;
  --brand: oklch(62% 0.22 25);
}
.card {
  padding: var(--space);
  color: var(--brand, black); /* fallback si --brand est invalide ou absente */
}
```

Le second argument de `var()` est un **fallback** : utilisé si la propriété n'est
pas définie ou contient une valeur invalide pour le contexte.

## Héritage en cascade vs Sass : la vraie différence

:::compare
::bad
```scss
// Sass : $brand est aplati au build, il n'existe plus dans le navigateur
$brand: blue;
.btn { background: $brand; }
// pour changer le thème à chaud, il faut recompiler. Impossible côté client.
```
::
::good
```css
:root { --brand: blue; }
.btn { background: var(--brand); }
/* changer le thème = écrire une nouvelle valeur, le DOM se met à jour seul */
.panel { --brand: rebeccapurple; } /* recolore les .btn DANS .panel uniquement */
```
::
:::

**Pourquoi.** Une variable Sass est un jeton de **préprocesseur** : au moment où
le CSS atteint le navigateur, `$brand` a disparu, remplacé par `blue` partout. Elle
ne participe ni à la cascade, ni à l'héritage, ni au DOM. Une custom property, elle,
est une **vraie propriété CSS** : elle hérite via l'arbre, se recalcule quand sa
valeur change, et peut être lue/écrite en JavaScript. Redéfinir `--brand` sur
`.panel` ne touche que le sous-arbre de `.panel` — c'est l'héritage en cascade qui
fait le scoping, gratuitement.

:::cheatsheet
- title: "--x: valeur"
  desc: "Déclaration. Héritable par défaut, comme `color`."
- title: "var(--x, fb)"
  desc: "Lecture avec fallback. Le fallback peut lui-même contenir un `var()`."
- title: "héritage"
  desc: "Une custom property prend la valeur du plus proche ancêtre qui la définit."
- title: "scope"
  desc: "Redéfinir sur un sélecteur limite l'effet à son sous-arbre."
- title: "JS"
  desc: "`el.style.setProperty('--x', v)` et `getComputedStyle(el).getPropertyValue('--x')`."
:::

## Theming par `data-theme`

Le scoping par héritage rend le theming presque trivial : on déclare des jeux de
valeurs sur un attribut, et tout le sous-arbre suit.

```css
:root,
[data-theme="light"] {
  --bg: white;
  --fg: black;
}
[data-theme="dark"] {
  --bg: #111;
  --fg: #eee;
}
body {
  background: var(--bg);
  color: var(--fg);
}
```

Basculer le thème = changer un seul attribut sur `<html>`. Aucune classe à
permuter sur chaque composant : ils lisent tous les mêmes tokens hérités.

:::callout{type="tip"}
Sépare deux couches de tokens : des **primitives** (`--blue-500`) et des tokens
**sémantiques** (`--color-surface: var(--blue-500)`). Les composants ne consomment
que le sémantique. Changer de thème ne touche alors que la couche sémantique, et
tu peux remapper sans toucher aux composants.
:::

## `@property` : typer et donc animer

Par défaut, une custom property est une chaîne opaque pour le moteur : il ne sait
pas que `--angle` est un angle, donc il ne peut pas l'interpoler. `@property`
déclare un **type** (syntaxe), une valeur initiale et l'héritage.

```css
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
.spinner {
  background: conic-gradient(from var(--angle), red, blue);
  transition: --angle 1s linear;
}
.spinner:hover {
  --angle: 360deg; /* s'anime en douceur, impossible sans @property */
}
```

**Pourquoi.** Sans `@property`, une transition sur une custom property fait un
saut brut : le moteur traite la valeur comme du texte, il n'y a pas d'espace
numérique entre `0deg` et `360deg` à interpoler. En déclarant `syntax: "<angle>"`,
tu donnes au moteur le **type** qui rend la valeur interpolable — il peut alors
calculer les états intermédiaires, exactement comme pour `opacity` ou `width`. Le
`initial-value` sert aussi de garde-fou : une affectation invalide retombe dessus
au lieu de casser la cascade.

## Scoping et portée

`inherits: false` dans `@property` est précieux pour des variables utilitaires
locales (un offset d'animation, un index) qu'on ne veut surtout pas voir fuir vers
les enfants. À l'inverse, pour des tokens de design, l'héritage est l'atout : on
les pose haut (`:root` ou un conteneur de thème) et tout le sous-arbre les
consomme. Le bon réflexe : héritable pour les tokens partagés, non héritable pour
l'état mécanique propre à un composant.
