---
title: "View Transitions : animer entre deux états"
slug: "view-transitions"
framework: "web"
level: "medior"
order: 10
duration: 16
prerequisites: ["events"]
updated: 2026-07-09
seoTitle: "View Transitions API — transitions same-document et cross-document (MPA)"
seoDescription: "Animer le passage entre deux états du DOM avec la View Transitions API : document.startViewTransition, view-transition-name, l'arbre de pseudo-éléments à personnaliser en CSS, et les transitions cross-document pour les sites multipages."
ogVariant: "iris"
related:
  - { framework: "web", slug: "history-routing" }
  - { framework: "css", slug: "transitions" }
---

Animer un changement d'état — filtrer une liste, ouvrir un détail, changer de page — exigeait longtemps de garder les **deux états simultanément** dans le DOM, de mesurer les positions avant et après, puis d'orchestrer des transitions FLIP à la main. Beaucoup de code fragile pour un simple morph. La **View Transitions API** renverse le problème : tu lui donnes un « avant » et un « après », et elle interpole toute seule. Le navigateur photographie l'écran, applique ta mutation, photographie de nouveau, et anime le passage d'une image à l'autre.

## Same-document : startViewTransition

`document.startViewTransition(callback)` orchestre une transition à l'intérieur de la **même page**. Le navigateur capture un instantané de l'état courant, exécute ton `callback` (qui mute le DOM), capture le nouvel état, puis anime le passage entre les deux — un **cross-fade** par défaut.

```js
function filtrer(critere) {
  // Pas de prise en charge : on mute directement, sans animation
  if (!document.startViewTransition) {
    appliquerFiltre(critere);
    return;
  }
  document.startViewTransition(() => appliquerFiltre(critere));
}
```

**Pourquoi un callback ?** Parce que la capture doit être **atomique**. Le navigateur a besoin de photographier l'ancien état, puis d'appliquer *toute* ta mutation d'un coup, puis de photographier le nouvel état. En enfermant la mutation dans une fonction, tu lui donnes le point exact où basculer : rien n'est peint entre les deux captures. Si tu mutais le DOM toi-même avant d'appeler l'API, il n'y aurait plus d'« avant » à capturer.

:::callout{type="info"}
Le callback peut être `async` et retourner une promesse : le navigateur attend sa résolution (par exemple un `fetch` de données) avant de capturer le nouvel état. Mais garde-le court — tant qu'il n'est pas résolu, l'ancien instantané reste figé à l'écran et l'interface paraît bloquée.
:::

## view-transition-name : animer un élément à part

Par défaut, toute la page est traitée comme **un seul** instantané qui se fond dans le suivant. Pour qu'un élément soit animé **indépendamment** — qu'il se déplace et change de taille entre les deux états au lieu de disparaître puis réapparaître — il faut lui donner un nom avec la propriété CSS `view-transition-name`.

```css
.vignette.active {
  view-transition-name: photo-heros;
}
```

Le navigateur repère l'élément portant `photo-heros` **avant** la mutation et celui qui le porte **après**, puis interpole position, taille et forme entre les deux : la petite vignette **grandit** en photo pleine, au lieu d'un fondu brutal. C'est le cas d'usage canonique — un morph de miniature vers vue détaillée.

:::callout{type="warn"}
Un `view-transition-name` doit être **unique à un instant donné**. Si deux éléments visibles portent le même nom pendant la capture, la transition est abandonnée (et souvent une erreur console). Attribue le nom dynamiquement à l'élément concerné, ou dérive-le d'un identifiant (`view-transition-name: photo-${id}`) pour garantir l'unicité.
:::

## L'arbre de pseudo-éléments

Pendant la transition, le navigateur construit un **arbre de pseudo-éléments** superposé à la page. Le personnaliser, c'est cibler ces pseudos en CSS. Pour chaque nom, la hiérarchie est :

- `::view-transition` — la racine, qui recouvre toute la fenêtre.
- `::view-transition-group(nom)` — un groupe par nom ; c'est lui qui anime **position et taille** (le morph du conteneur).
- `::view-transition-image-pair(nom)` — le conteneur de l'ancienne et de la nouvelle image, qui gère le **fondu** entre elles.
- `::view-transition-old(nom)` — l'instantané de l'**ancien** état.
- `::view-transition-new(nom)` — l'instantané du **nouvel** état.

Le nom `root` désigne le reste de la page ; `*` cible tous les groupes. Comme ce sont de vrais pseudo-éléments animés, tu ajustes durée, easing et direction comme n'importe quelle animation CSS.

```css
/* Ralentir et adoucir le morph de la photo héros */
::view-transition-group(photo-heros) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

/* Remplacer le cross-fade par un glissement de l'ancien état vers la gauche */
@keyframes sortir-gauche {
  to { transform: translateX(-40px); opacity: 0; }
}
::view-transition-old(root) {
  animation: sortir-gauche 200ms ease-in both;
}
```

:::callout{type="tip"}
Pour comprendre ce qui bouge, ralentis tout : `::view-transition-group(*) { animation-duration: 4s; }` étire chaque transition et rend l'arbre lisible dans l'inspecteur. Retire-le ensuite.
:::

## Respecter prefers-reduced-motion

Une transition qui déplace et redimensionne des blocs est exactement le genre de mouvement qui gêne les personnes sensibles au **mouvement animé**. La View Transitions API ne coupe rien pour toi : c'est à toi de neutraliser les animations quand l'utilisateur l'a demandé au niveau système.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none;
  }
}
```

**Pourquoi `animation: none` plutôt que ne rien lancer ?** Parce que la transition met malgré tout à jour le DOM instantanément : couper l'animation supprime le déplacement sans casser le changement d'état. L'interface bascule d'un coup, ce qui est exactement le comportement attendu ici.

## Cross-document (MPA) : @view-transition

Le même mécanisme fonctionne entre **deux documents** lors d'une navigation classique — sans SPA ni JavaScript de routing. Il suffit d'activer l'option, en CSS, dans **les deux pages** (celle qu'on quitte et celle qu'on rejoint) :

```css
@view-transition {
  navigation: auto;
}
```

À partir de là, une navigation same-origin entre les deux pages déclenche une transition, exactement comme `startViewTransition` en interne. Un `view-transition-name` partagé — par exemple sur le titre d'un article présent dans la liste **et** dans la page détail — produit un morph continu d'une page à l'autre. C'est ce qui donne l'impression d'app fluide à un site multipages tout ce qu'il y a de plus classique.

Pour ajuster la transition juste avant qu'elle ne parte, deux événements se déclenchent sur chaque navigation same-origin :

- `pageswap` — sur la page **sortante**, juste avant que son instantané soit pris. Le moment pour poser ou retirer un `view-transition-name`, ou passer une donnée à la page suivante via `sessionStorage`.
- `pagereveal` — sur la page **entrante**, après son initialisation mais avant le premier rendu. Le moment pour personnaliser la nouvelle page avant la capture de son instantané.

```js
// Marquer la bonne vignette juste avant de quitter la liste
window.addEventListener("pageswap", (e) => {
  if (!e.viewTransition) return; // pas de transition en cours : rien à faire
  const cible = document.querySelector(".vignette.cliquee");
  if (cible) cible.style.viewTransitionName = "photo-heros";
});
```

:::callout{type="info"}
Le support est désormais large. Les transitions **same-document** sont disponibles dans les navigateurs à moteur Chromium depuis 2023 ; les transitions **cross-document** (`@view-transition`) ont atteint le statut **Baseline** début 2026, prises en charge par les versions récentes de Chrome, Edge, Safari et Firefox. Le `if (!document.startViewTransition)` reste un bon réflexe : sans prise en charge, la mutation s'applique sans animation, ce qui est un dégradé acceptable.
:::

## La promesse retournée : finished, ready, updateCallbackDone

`startViewTransition` retourne un objet `ViewTransition` qui expose **trois promesses** pour se brancher sur les étapes de la transition, plus une méthode pour l'annuler.

```js
const transition = document.startViewTransition(() => appliquerFiltre());

// Résolue quand les pseudo-éléments sont créés et l'animation lancée
transition.ready.then(() => console.log("animation en cours"));

// Résolue quand le callback (la mutation du DOM) est terminé
await transition.updateCallbackDone;

// Résolue quand toute l'animation est finie et la page dans son état final
await transition.finished;
console.log("transition terminée, on peut enchaîner");
```

- `updateCallbackDone` suit **uniquement** ta mutation du DOM, indépendamment de l'animation — utile pour réagir à l'état final même si l'utilisateur a coupé les animations.
- `ready` se résout une fois l'arbre de pseudo-éléments monté ; c'est le point où lancer une animation JavaScript personnalisée dessus (via `element.animate`).
- `finished` marque la toute fin.

Pour **interrompre** une transition — par exemple si l'utilisateur relance un filtre avant la fin de la précédente — appelle `transition.skipTransition()` : la mutation reste appliquée, mais l'animation est sautée et `finished` se résout aussitôt.

## À retenir

:::cheatsheet
- title: "document.startViewTransition(cb)"
  desc: "capture avant, exécute le callback, capture après, anime ; cross-fade par défaut"
- title: "Callback atomique"
  desc: "la mutation dans le callback donne le point exact où basculer entre les deux captures"
- title: "view-transition-name"
  desc: "anime un élément à part (morph position/taille) ; nom unique à un instant donné"
- title: "Arbre de pseudo-éléments"
  desc: "group / image-pair / old / new à cibler en CSS pour durée, easing, direction"
- title: "prefers-reduced-motion"
  desc: "coupe les animations avec animation: none ; le changement d'état reste instantané"
- title: "@view-transition { navigation: auto }"
  desc: "transitions cross-document (MPA) dans les deux pages ; pageswap / pagereveal pour ajuster"
- title: "ready / updateCallbackDone / finished"
  desc: "trois promesses pour chaîner ; skipTransition() pour annuler l'animation"
:::
