---
title: "Transitions"
slug: "transitions"
framework: "css"
level: "medior"
order: 4
duration: 13
prerequisites: ["box-model"]
updated: 2026-05-23
seoTitle: "CSS Transitions — shorthand, courbes et propriétés à animer"
seoDescription: "Maîtriser transition : property, duration, timing-function, delay, les courbes cubic-bezier, pourquoi animer transform/opacity plutôt que width/top, et prefers-reduced-motion."
ogVariant: "gold"
related:
  - { framework: "css", slug: "transforms" }
---

## Interpoler entre deux états

Une transition ne crée pas le mouvement : elle **interpole** automatiquement entre
la valeur courante d'une propriété et sa nouvelle valeur quand celle-ci change (au
`:hover`, à l'ajout d'une classe, à un changement d'état). Tu décris le « avant »
et le « après », le navigateur fabrique les images intermédiaires. Survole et
change les réglages ci-dessous pour sentir l'effet de chaque paramètre :

:::demo{kind="transitions"}
:::

## Le shorthand `transition`

`transition` regroupe quatre sous-propriétés, dans cet ordre de lecture :
**property**, **duration**, **timing-function**, **delay**. La première valeur de
temps lue est la durée, la seconde le délai — c'est ainsi que le parseur les
distingue.

```css
.btn {
  /* propriété  durée  courbe        délai */
  transition: background-color 200ms ease-out 0ms;
}
.btn:hover {
  background-color: #2563eb;
}
```

Tu peux empiler plusieurs transitions séparées par des virgules, chacune ciblant
une propriété avec son propre tempo :

```css
.card {
  transition:
    transform 250ms ease,
    opacity 250ms ease,
    box-shadow 400ms ease-out 50ms;
}
```

:::cheatsheet
- title: "transition-property"
  desc: "Quelle(s) propriété(s) animer. `all` cible tout (à éviter), `none` désactive."
- title: "transition-duration"
  desc: "Durée en `s` ou `ms`. Sous ~100ms l'effet est imperceptible, au-delà de ~500ms il traîne."
- title: "transition-timing-function"
  desc: "La courbe de vitesse : `ease`, `linear`, `cubic-bezier(...)`, `steps(...)`."
- title: "transition-delay"
  desc: "Attente avant le démarrage. Négatif = démarre déjà entamé."
:::

## Ce qui est animable (et ce qui ne l'est pas)

Une propriété n'est interpolable que si le navigateur sait calculer des valeurs
intermédiaires entre deux états. Les **longueurs** (`px`, `%`, `rem`), les
**couleurs**, `opacity`, les `transform` s'interpolent. Les valeurs
**discrètes** comme `display` ne se prêtent pas à un dégradé numérique : elles
basculent d'un coup. En 2026, `transition-behavior: allow-discrete` permet
justement d'orchestrer ces propriétés discrètes (typiquement `display: none` ↔
`block`) en les commutant aux bornes de la transition, indispensable pour animer
l'apparition d'un élément avec `@starting-style`.

## Les courbes : `ease` contre `cubic-bezier`

La timing-function décrit **comment** la durée se répartit, pas combien de temps.
`linear` avance à vitesse constante (mécanique, robotique). `ease` (la valeur par
défaut) démarre vite, ralentit à la fin — naturel pour la plupart des UI.
`ease-in` accélère (bon pour les sorties), `ease-out` décélère (bon pour les
entrées). Toutes ces valeurs ne sont que des raccourcis pour des
`cubic-bezier(x1, y1, x2, y2)` : deux points de contrôle qui sculptent la courbe.

```css
/* ease vaut exactement ceci */
.a { transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1); }

/* un léger rebond : y2 > 1 fait dépasser puis revenir */
.b { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
```

:::callout{type="tip"}
Une asymétrie subtile rend les interfaces vivantes : `ease-out` à l'entrée
(l'élément arrive et se pose en douceur) et `ease-in` à la sortie (il s'efface en
accélérant). C'est la base du *material motion* et ça coûte deux mots.
:::

## Animer `transform`/`opacity`, pas `width`/`top`

Le choix de la propriété décide de la fluidité. Anime ce qui vit sur le
**compositor**, pas ce qui force le moteur à recalculer la mise en page.

:::compare
::bad
```css
/* déplace en jouant sur la géométrie de boîte */
.panel {
  position: absolute;
  left: 0;
  transition: left 300ms ease, width 300ms ease;
}
.panel.open { left: 240px; width: 480px; }
```
::
::good
```css
/* même mouvement, mais via la couche de composition */
.panel {
  transition: transform 300ms ease;
  will-change: transform;
}
.panel.open { transform: translateX(240px) scaleX(1.4); }
```
::
:::

**Pourquoi.** Animer `left`, `top`, `width` ou `height` modifie la **géométrie de
boîte** : à chaque image, le navigateur doit refaire le **layout** (reflow) pour
repositionner les éléments voisins, puis repeindre (paint), puis composer. Ce
pipeline complet se rejoue 60 fois par seconde sur le thread principal — il sature
vite et fait sauter des images. `transform` et `opacity`, à l'inverse, sont gérés
par le **compositor** : la couche de l'élément est déjà rasterisée et envoyée au
GPU ; l'animation se résume à re-positionner ou re-mélanger cette texture, sans
toucher au layout ni au paint. `will-change: transform` signale au navigateur de
promouvoir l'élément sur sa propre couche **en amont**, évitant un à-coup au
premier frame — mais il consomme de la mémoire GPU, donc on le retire une fois
l'animation finie plutôt que de le laisser sur des centaines d'éléments.

## Le piège de `transition: all`

`transition: all 300ms` semble pratique mais demande au navigateur de
**surveiller toute propriété qui change**, y compris des propriétés héritées ou
recalculées que tu n'avais pas l'intention d'animer (une `height` qui bouge à
cause d'un reflow voisin, une couleur héritée). Résultat : des animations
fantômes et un surcoût de surveillance.

:::compare
::bad
```css
.menu { transition: all 300ms ease; }
```
::
::good
```css
.menu {
  transition:
    transform 300ms ease,
    opacity 300ms ease;
}
```
::
:::

**Pourquoi.** Avec `all`, le navigateur compare l'ancien et le nouveau *computed
style* de **chaque** propriété transitionnable à chaque changement, et déclenche
une transition pour tout ce qui diffère. Tu perds le contrôle de ce qui bouge, et
une propriété coûteuse (layout) peut se retrouver animée sans que tu l'aies voulu,
ramenant le reflow par la fenêtre. Lister explicitement les propriétés rend
l'intention claire, limite la surveillance au strict nécessaire et garantit que
seules des propriétés bon marché (compositor) sont animées.

## Respecter `prefers-reduced-motion`

Une partie des utilisateurs configure leur système pour réduire les animations
(vestibulaire, attention, économie d'énergie). On honore ce choix sans détruire
les retours visuels utiles.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

On ne met pas la durée à `0` strict (certains navigateurs n'émettraient pas
l'événement `transitionend` attendu par du JS), mais à une durée quasi nulle :
l'effet devient instantané tout en restant techniquement une transition. Mieux
encore, raisonne *opt-in* : pars de l'absence de mouvement et n'ajoute les
transitions que dans `@media (prefers-reduced-motion: no-preference)`.
