---
title: "Les événements du DOM"
slug: "events"
framework: "web"
level: "medior"
order: 2
duration: 15
prerequisites: ["fetch"]
updated: 2026-05-23
seoTitle: "Événements DOM : capture, bubbling, délégation et cleanup"
seoDescription: "Comprendre addEventListener et l'objet Event : les 3 phases capture/bubble, la délégation performante, preventDefault vs stopPropagation, passive et AbortSignal."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
---

Un événement, c'est le navigateur qui te signale qu'il s'est passé quelque chose : un clic, une frappe, un chargement, un changement de réseau. Le modèle d'événements du DOM est l'un des plus mal compris du web parce qu'on s'arrête souvent à `addEventListener("click", …)`. Or sa vraie puissance — la délégation, le contrôle de la propagation, le cleanup — vient du fait qu'un événement **voyage** à travers l'arbre du DOM en trois phases.

## addEventListener et l'objet Event

`addEventListener(type, handler, options)` attache un gestionnaire. À chaque déclenchement, le navigateur appelle ton `handler` avec un **objet Event** qui décrit ce qui s'est passé.

```js
button.addEventListener("click", (event) => {
  event.type;          // "click"
  event.target;        // l'élément réel d'où part l'événement
  event.currentTarget; // l'élément sur lequel CE listener est attaché
  event.timeStamp;     // quand
});
```

La distinction `target` / `currentTarget` est la clé de tout ce qui suit. `target` est la source profonde de l'événement (le pixel exact cliqué) ; `currentTarget` est l'élément en train de traiter l'événement *maintenant*. Ils diffèrent dès qu'un événement traverse plusieurs éléments.

## Les trois phases : capture, cible, bubbling

Quand tu cliques un bouton imbriqué, l'événement ne « naît » pas sur le bouton. Il fait un aller-retour dans l'arbre, en trois phases :

1. **Capture** : il descend de `window` vers la cible, en traversant chaque ancêtre.
2. **Cible** : il atteint l'élément cliqué.
3. **Bubbling** (remontée) : il remonte de la cible vers `window`.

Par défaut, `addEventListener` écoute en phase de **bubbling**. Passer `{ capture: true }` écoute à la descente. La plupart des événements remontent (`click`, `input`, `keydown`), quelques-uns non (`focus`, `scroll`, `load`).

```js
parent.addEventListener("click", () => console.log("2 — parent (bubble)"));
child.addEventListener("click", () => console.log("1 — enfant"));
// Clic sur l'enfant => "1 — enfant" puis "2 — parent" : ça remonte.
```

## La délégation d'événements

La délégation exploite le bubbling : au lieu d'attacher un listener à chaque enfant, tu en attaches **un seul** sur un ancêtre commun, et tu lis `event.target` pour savoir qui a été touché.

:::compare
::bad
```js
// 500 lignes -> 500 listeners attachés un par un
document.querySelectorAll(".item").forEach((item) => {
  item.addEventListener("click", () => ouvrir(item.dataset.id));
});
// + il faut tout rebrancher quand on ajoute une ligne dynamiquement
```
::
::good
```js
// Un seul listener, qui couvre aussi les éléments futurs
list.addEventListener("click", (event) => {
  const item = event.target.closest(".item");
  if (!item) return;            // clic hors d'un item : on ignore
  ouvrir(item.dataset.id);
});
```
::
:::

**Pourquoi.** À gauche, chaque listener occupe de la mémoire et doit être rebranché manuellement à chaque ajout d'élément dans la liste — un élément inséré après l'attache n'a aucun gestionnaire. À droite, on profite du fait que le clic *remonte* (phase de bubbling) jusqu'à l'ancêtre `list` : un seul gestionnaire intercepte tous les clics, présents comme futurs. `event.target` indique la source réelle et `closest(".item")` retrouve l'élément logique même si l'utilisateur a cliqué sur un sous-élément (une icône, un span interne). C'est moins de mémoire, zéro re-branchement, et ça fonctionne sur du contenu injecté dynamiquement — directement grâce au mécanisme de propagation.

## preventDefault vs stopPropagation

Ces deux méthodes sont souvent confondues, mais elles agissent sur des choses orthogonales.

- **`preventDefault()`** annule l'**action par défaut du navigateur** liée à l'événement : empêcher un lien de naviguer, un formulaire de se soumettre, une case de se cocher. Cela n'arrête pas la propagation.
- **`stopPropagation()`** arrête le **voyage de l'événement** dans l'arbre : les ancêtres (ou descendants, en capture) ne le verront plus. Cela n'annule pas l'action par défaut.

```js
link.addEventListener("click", (e) => {
  e.preventDefault();   // le lien ne navigue pas...
  // ...mais l'événement remonte toujours jusqu'aux parents
});
```

:::callout{type="warn"}
Évite `stopPropagation()` par réflexe. Il « coupe » silencieusement l'événement pour tout le reste de la page, ce qui casse souvent la délégation, les analytics ou la fermeture d'un menu au clic extérieur. Neuf fois sur dix, tu veux `preventDefault()` (annuler une action), pas `stopPropagation()` (cacher l'événement aux autres).
:::

## Passive listeners

Pour les événements de défilement et de toucher (`scroll`, `touchstart`, `wheel`), le navigateur doit attendre de savoir si ton handler va appeler `preventDefault()` avant de faire défiler — ce qui peut bloquer le scroll et créer du jank. L'option `{ passive: true }` est une **promesse** que tu ne feras pas de `preventDefault`, ce qui autorise le navigateur à défiler immédiatement.

```js
window.addEventListener("scroll", onScroll, { passive: true });
```

C'est une optimisation de réactivité importante sur mobile. En contrepartie, appeler `preventDefault()` dans un listener passif est ignoré (et émet un avertissement).

## Le cleanup : removeEventListener et AbortSignal

Un listener qui n'est jamais retiré sur un élément qui survit (souvent attaché à `window` ou `document`) est une **fuite mémoire** : il retient la fermeture et tout ce qu'elle capture. `removeEventListener` exige exactement la **même référence de fonction** que celle ajoutée — une fonction anonyme ne peut donc pas être retirée.

```js
function onResize() {}
window.addEventListener("resize", onResize);
window.removeEventListener("resize", onResize); // même référence : OK
```

La forme moderne, bien plus pratique quand tu as plusieurs listeners à nettoyer ensemble, est l'`AbortController` : tu passes son `signal` à chaque `addEventListener`, et un seul `abort()` les détache tous.

```js
const controller = new AbortController();
const { signal } = controller;

node.addEventListener("click", onClick, { signal });
node.addEventListener("keydown", onKey, { signal });
window.addEventListener("resize", onResize, { signal });

// Un seul appel retire les trois listeners d'un coup :
controller.abort();
```

:::callout{type="tip"}
Le `signal` est l'outil de cleanup idéal dans les frameworks à composants : tu crées un `AbortController` au montage, tu appelles `abort()` au démontage. Plus besoin de garder une référence à chaque handler pour pouvoir le retirer.
:::

## À retenir

:::cheatsheet
- title: "target vs currentTarget"
  desc: "target = source réelle du clic ; currentTarget = l'élément qui écoute maintenant."
- title: "3 phases"
  desc: "Capture (descente), cible, bubbling (remontée) ; addEventListener écoute en bubble par défaut."
- title: "Délégation"
  desc: "Un listener sur un ancêtre + event.target.closest() : moins de mémoire, couvre le contenu futur."
- title: "preventDefault"
  desc: "Annule l'action par défaut du navigateur (nav, submit), pas la propagation."
- title: "stopPropagation"
  desc: "Arrête le voyage de l'événement ; à éviter, casse souvent la délégation."
- title: "passive: true"
  desc: "Promet de ne pas preventDefault sur scroll/touch : défilement fluide, surtout mobile."
- title: "Cleanup par signal"
  desc: "Passe un AbortSignal à addEventListener ; un abort() détache tous les listeners."
:::
