---
title: "contrast-color() : le texte qui s'adapte"
slug: "contrast-color"
framework: "css"
level: "senior"
order: 12
duration: 13
prerequisites: ["custom-properties"]
updated: 2026-07-25
seoTitle: "CSS contrast-color() — texte lisible automatiquement, et ses limites réelles"
seoDescription: "contrast-color() choisit automatiquement du texte noir ou blanc selon le fond, Baseline depuis avril 2026. Comment l'utiliser dans un système de thème, pourquoi il ne garantit pas WCAG AA sur les fonds mi-tons, et comment compenser."
ogVariant: "gold"
related:
  - { framework: "css", slug: "custom-properties" }
  - { framework: "css", slug: "colors" }
---

Un design system expose une couleur de marque configurable. Un client la passe en
jaune vif, un autre en bleu nuit. La couleur du texte posé dessus, elle, est
codée en dur — et devient illisible dans un cas sur deux. La parade habituelle
consiste à maintenir des **paires** couleur de fond / couleur de texte, ou à
calculer la luminance en JavaScript au chargement.

`contrast-color()` fait ce calcul nativement, dans le moteur CSS, à chaque
recalcul de style.

## Le principe

```css
:root {
  --marque: #1e40af;
}

.bouton {
  background-color: var(--marque);
  color: contrast-color(var(--marque));   /* blanc ou noir, selon le fond */
}
```

La fonction prend une couleur et renvoie **`white` ou `black`** — celle des deux
qui contraste le plus avec l'argument. En cas d'égalité parfaite, c'est `white`.

:::callout{type="info"}
Retiens tout de suite la portée exacte : ce n'est **pas** un moteur de couleurs
accessibles générique. `contrast-color()` ne renvoie ni un gris, ni une variante
désaturée de ta teinte — uniquement **noir ou blanc**. C'est un choix binaire
automatisé, pas une palette calculée.
:::

## Ce que ça remplace

:::compare
::bad
```css
/* Chaque couleur de fond impose sa paire, maintenue à la main.
   Ajouter un thème = ajouter une ligne, et l'oublier un jour. */
.bouton--primaire   { background: #1e40af; color: white; }
.bouton--alerte     { background: #fbbf24; color: black; }
.bouton--succes     { background: #16a34a; color: white; }
.bouton--client-xyz { background: var(--marque); color: white; } /* faux si clair */
```
::
::good
```css
/* Une seule règle. La couleur de texte suit le fond, quel qu'il soit. */
.bouton {
  background: var(--fond);
  color: contrast-color(var(--fond));
}
```
::
:::

**Pourquoi c'est structurellement meilleur.** La règle CSS n'énumère plus les
combinaisons : elle exprime la *relation*. Une couleur injectée à l'exécution —
thème client, préférence utilisateur, couleur extraite d'une image — obtient un
texte adapté sans qu'aucune ligne de CSS ni de JavaScript n'ait à le prévoir.
C'est le passage d'une table de correspondance à une contrainte auto-appliquée.

## La limite qu'il faut connaître

C'est le point à ne pas rater, et il disqualifie l'usage naïf :

:::callout{type="warn"}
`contrast-color()` **ne garantit pas** un ratio WCAG AA. Il choisit le plus
contrasté entre noir et blanc — même quand aucun des deux n'est suffisant. Sur un
fond **mi-ton**, les deux options échouent. La documentation prend l'exemple d'un
bleu roi `#2277d3` : la fonction renvoie du noir, qui reste illisible pour du
petit texte.
:::

D'où la règle d'usage : **réserve `contrast-color()` aux fonds franchement clairs
ou franchement sombres**. Les mi-tons — bleus moyens, verts moyens, gris centraux
— restent une zone où aucun choix binaire ne fonctionne, et qui demande une
décision de design, pas une fonction.

Le corollaire pratique : contraindre la couleur *avant* de la passer à la
fonction. Un système de thème robuste normalise la luminance de la couleur de
marque dans une plage sûre, puis applique `contrast-color()` :

```css
:root {
  /* On force la couleur du client dans une plage sombre exploitable
     plutôt que d'accepter n'importe quelle luminance. */
  --fond-action: oklch(from var(--marque) clamp(0.2, l, 0.45) c h);
}

.bouton {
  background: var(--fond-action);
  color: contrast-color(var(--fond-action));
}
```

Les couleurs relatives `oklch(from …)` bornent la luminance ; `contrast-color()`
finit le travail. Les deux se complètent — la première rend la seconde fiable.

## Dans un système de thème

L'intérêt se voit surtout sur les rôles sémantiques, où la même règle sert le
clair et le sombre :

```css
:root {
  --surface: oklch(0.98 0.01 250);
  --accent:  oklch(0.55 0.18 250);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: oklch(0.18 0.02 250);
    --accent:  oklch(0.72 0.15 250);
  }
}

.carte      { background: var(--surface); color: contrast-color(var(--surface)); }
.carte__cta { background: var(--accent);  color: contrast-color(var(--accent)); }
```

Le basculement clair/sombre ne touche que les **deux** variables de fond. Les
couleurs de texte suivent seules, y compris si un thème client écrase `--accent`
plus tard.

:::callout{type="tip"}
La fonction se recalcule comme n'importe quelle valeur CSS : un changement de
custom property par JavaScript, une media query, une container query, un
`:hover` qui modifie le fond — le texte se réajuste sans code supplémentaire. Un
calcul de luminance fait en JS au chargement, lui, se périme dès que le fond
change.
:::

## Support et repli

Baseline **nouvellement disponible depuis avril 2026** : les versions récentes de
tous les moteurs la gèrent, mais une part réelle du parc ne la connaît pas
encore. Le repli tient en deux lignes :

```css
.bouton {
  background: var(--fond);
  color: white;                            /* repli pour les moteurs anciens */
  color: contrast-color(var(--fond));      /* ignoré s'il ne comprend pas */
}
```

Une déclaration non comprise est ignorée : les anciens navigateurs gardent le
blanc, les récents appliquent le calcul. Pas besoin de `@supports` pour ce cas
simple.

## À retenir

`contrast-color()` transforme une table de paires fond/texte en une règle unique
qui exprime la relation. C'est particulièrement utile dès qu'une couleur arrive à
l'exécution — thème client, préférence, couleur dynamique. Mais son domaine est
étroit : **noir ou blanc uniquement**, et **aucune garantie WCAG** sur les fonds
mi-tons. Utilise-le sur des fonds nettement clairs ou sombres, en bornant la
luminance en amont, et continue de vérifier tes contrastes réels.

:::cheatsheet
- title: "contrast-color(couleur)"
  desc: "Renvoie white ou black, celui qui contraste le plus. Égalité : white. Rien d'autre."
- title: "Le gain"
  desc: "Une règle exprime la relation fond/texte au lieu d'énumérer les paires. Marche sur une couleur runtime."
- title: "Pas de garantie WCAG"
  desc: "Sur un fond mi-ton (ex. #2277d3), ni noir ni blanc ne passe. La fonction choisit quand même."
- title: "Borner en amont"
  desc: "oklch(from … clamp(0.2, l, 0.45) c h) contraint la luminance et rend contrast-color() fiable."
- title: "Recalcul natif"
  desc: "Suit les custom properties, media/container queries et :hover. Contrairement à un calcul JS figé."
- title: "Baseline avril 2026"
  desc: "Repli : déclarer color: white avant la ligne contrast-color(). L'ancienne valeur reste si non comprise."
:::
