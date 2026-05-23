---
title: "Scroll-driven animations"
slug: "scroll-animations"
framework: "css"
level: "senior"
order: 3
duration: 15
prerequisites: ["transforms"]
updated: 2026-05-23
seoTitle: "CSS — Scroll-driven animations natives, scroll() et view()"
seoDescription: "animation-timeline: scroll() et view(), scroll-timeline et named timelines, ranges, pourquoi c'est sur le compositor vs listeners JS, support 2026 et fallback @supports."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "transforms" }
---

## Lier le temps de l'animation au scroll

Une animation CSS classique se déroule sur une **timeline temporelle** : elle
avance avec l'horloge. Les *scroll-driven animations* remplacent cette horloge par
une **timeline de défilement** : la progression de l'animation est pilotée par la
position du scroll, pas par le temps qui passe. Scrolle vers le bas pour voir la
barre de progression et les éléments se révéler au fil du défilement :

:::demo{kind="scroll"}
:::

## `scroll()` : suivre le défilement d'un conteneur

`animation-timeline: scroll()` mappe la progression du **scroller** sur la timeline
de l'animation. À 0 % de scroll, l'animation est à 0 % ; à 100 % de scroll, à
100 %. On définit toujours une `animation` normale (keyframes + durée), mais la
`duration` devient ignorée : c'est la timeline qui dicte l'avancement.

```css
@keyframes grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.progress-bar {
  transform-origin: left;
  animation: grow linear; /* linear est quasi obligatoire ici */
  animation-timeline: scroll(root block);
}
```

`scroll(<scroller> <axis>)` : le scroller vaut `root` (le document), `nearest`
(l'ancêtre scrollable le plus proche, défaut) ou `self` ; l'axe vaut `block`,
`inline`, `x` ou `y`.

:::callout{type="tip"}
Utilise `animation: ... linear` presque systématiquement. Une courbe `ease`
appliquée à une timeline de scroll produit une vitesse non-linéaire par rapport au
doigt : l'animation accélère et ralentit alors que le scroll, lui, est régulier —
sensation de glissement « savonneux ». Le scroll étant déjà une position physique,
la correspondance la plus naturelle est linéaire.
:::

## `view()` : selon la visibilité de l'élément

`view()` crée une timeline fondée sur la **traversée de l'élément dans le
viewport** : elle progresse de l'instant où l'élément entre par un bord à celui où
il sort par l'autre. C'est la timeline des effets « apparaît en fondu quand je
deviens visible ».

```css
@keyframes reveal {
  from { opacity: 0; translate: 0 40px; }
  to   { opacity: 1; translate: 0 0; }
}
.card {
  animation: reveal linear both;
  animation-timeline: view();
  /* ne joue que pendant les 200 premiers px de visibilité d'entrée */
  animation-range: entry 0% cover 30%;
}
```

`animation-range` borne la portion de timeline utilisée. Les mots-clés de plage :
`entry` (l'élément entre dans le viewport), `exit` (il en sort), `cover`
(intégralité de la traversée), `contain` (tant qu'il est entièrement visible). On
combine deux bornes pour cadrer exactement la fenêtre d'animation.

:::cheatsheet
- title: "animation-timeline: scroll()"
  desc: "Progression liée au défilement d'un scroller. `scroll(root block)` = page entière."
- title: "animation-timeline: view()"
  desc: "Progression liée à la traversée de l'élément dans le viewport."
- title: "scroll-timeline-name"
  desc: "Nomme une timeline (`--ma-timeline`) sur le scroller pour la réutiliser ailleurs."
- title: "view-timeline-name"
  desc: "Idem pour une timeline de visibilité, posée sur l'élément observé."
- title: "animation-range"
  desc: "Borne la plage : `entry`, `exit`, `cover`, `contain`, en % ou longueurs."
- title: "timeline-scope"
  desc: "Élargit la portée d'une named timeline pour qu'un parent/cousin puisse la viser."
:::

## Named timelines : découpler source et cible

Avec `scroll()`/`view()` anonymes, l'animation lit son scroller ancêtre. Pour
qu'un élément réagisse au scroll d'un **autre** conteneur (pas son ancêtre direct),
on nomme la timeline sur la source et on la consomme par son nom.

```css
/* la source déclare une timeline nommée */
.gallery {
  overflow-x: auto;
  scroll-timeline-name: --gallery;
  scroll-timeline-axis: inline;
}
/* la cible la consomme */
.indicator {
  animation: grow linear;
  animation-timeline: --gallery;
}
```

Si la cible n'est pas un descendant de la source, `timeline-scope: --gallery` posé
sur un ancêtre commun rend le nom visible aux deux.

## Pourquoi c'est sur le compositor (et pas un listener JS)

L'approche historique — un `addEventListener('scroll', ...)` qui lit
`scrollY` et écrit des styles — est structurellement saccadée.

:::compare
::bad
```js
// thread principal : se déclenche après le scroll, peut rater des frames
window.addEventListener('scroll', () => {
  const p = window.scrollY / maxScroll;
  bar.style.transform = `scaleX(${p})`;
});
```
::
::good
```css
/* déclaratif : le compositor pilote l'animation, hors thread principal */
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll(root block);
}
```
::
:::

**Pourquoi.** Un listener `scroll` s'exécute sur le **thread principal**, et le
scroll moderne vit sur le **compositor thread** (pour rester fluide même quand le
JS est occupé). Les deux sont donc **désynchronisés** : l'événement `scroll` arrive
*après* que le compositor a déjà déplacé la page, souvent groupé et limité en
fréquence. Tu écris donc une transformation en retard d'une ou plusieurs frames —
d'où le décrochage visible entre le doigt et la barre. Les scroll-driven animations
natives, elles, sont évaluées **sur le compositor** : la timeline lit directement
le décalage de scroll au même endroit et au même instant que le déplacement de la
page, et n'anime que des propriétés compositables (`transform`, `opacity`). Aucun
aller-retour vers le thread principal, aucune latence d'event : la progression et
le scroll sont la **même** valeur. C'est la différence entre « réagir au scroll » et
« être le scroll ».

## Support 2026, `@supports` et `prefers-reduced-motion`

En 2026, les scroll-driven animations sont stables dans les navigateurs Chromium et
Firefox ; Safari les a livrées plus récemment et un parc d'anciens navigateurs
subsiste. Le motif est une **amélioration progressive** : un rendu correct sans
animation, enrichi seulement là où c'est supporté.

```css
/* fallback : tout est visible par défaut, sans dépendre du scroll */
.card { opacity: 1; }

@supports (animation-timeline: view()) {
  .card {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 30%;
  }
}

/* respecter le réglage système */
@media (prefers-reduced-motion: reduce) {
  .card { animation: none; opacity: 1; translate: none; }
}
```

**Pourquoi `@supports` et pas seulement un fallback statique.** Sans la garde
`@supports`, un navigateur qui ignore `animation-timeline` exécuterait quand même
l'`animation` *temporelle* déclarée : l'élément jouerait son fondu une fois au
chargement, puis disparaîtrait si la keyframe `from` met `opacity: 0`. En enfermant
toute la déclaration dans `@supports (animation-timeline: view())`, les navigateurs
non compatibles conservent l'état de base lisible (`opacity: 1`) et seuls ceux qui
savent piloter la timeline activent l'effet — sans contenu invisible ni saut.
