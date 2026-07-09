---
title: "La Navigation API : le routing repensé"
slug: "navigation-api"
framework: "web"
level: "medior"
order: 11
duration: 15
prerequisites: ["history-routing"]
updated: 2026-07-09
seoTitle: "Navigation API — intercepter la navigation SPA proprement, au-delà de History"
seoDescription: "La Navigation API remplace les bricolages de l'History API : un événement navigate central, intercept() pour gérer les transitions SPA, une liste d'entrées inspectable, et l'état de navigation. Ce qu'elle change et son support en 2026."
ogVariant: "iris"
related:
  - { framework: "web", slug: "history-routing" }
  - { framework: "web", slug: "view-transitions" }
---

Construire un routeur SPA sur l'History API, c'est assembler un patchwork. `pushState` change l'URL mais reste **silencieux**, alors tu écoutes `popstate` — qui ne se déclenche **que** sur le retour/avance, jamais sur tes navigations sortantes. Pour ces dernières, tu interceptes les clics de liens à la main. Et tu n'as **aucune vue** sur l'historique : `history` ne t'expose que sa longueur et l'état courant. Trois mécanismes disjoints à câbler, à synchroniser, à ne pas oublier. La **Navigation API** unifie tout derrière un seul événement, `navigate`, qui capte **chaque** navigation same-origin et te laisse la gérer depuis un unique point d'entrée.

## Le problème : trois mécanismes à recoller

Un routeur bâti sur l'History API traite séparément les deux directions de navigation, et l'API ne lui offre aucune introspection de l'historique.

:::compare
::bad
```js
// Navigation SORTANTE : intercepter chaque clic de lien à la main
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.origin !== location.origin) return;
  e.preventDefault();
  history.pushState(null, "", a.href);
  render(location.pathname);            // ...et ne pas oublier ce render
});
// Navigation ENTRANTE : popstate, l'autre moitié du câblage
window.addEventListener("popstate", () => render(location.pathname));
// L'historique ? history.length, et rien d'autre. Aucune liste inspectable.
```
::
::good
```js
// Un seul écouteur pour TOUTES les navigations same-origin
navigation.addEventListener("navigate", (e) => {
  if (!e.canIntercept) return;
  e.intercept({
    handler: () => render(new URL(e.destination.url).pathname),
  });
});
```
::
:::

**Pourquoi.** À gauche, la logique est éclatée en deux moitiés qu'il faut maintenir en phase : les clics d'un côté, `popstate` de l'autre, avec le même `render` dupliqué et le risque permanent d'un chemin oublié. À droite, `navigate` se déclenche pour **les deux directions à la fois** — clic de lien, bouton retour/avance, `navigation.navigate()` — donc un seul écouteur suffit. Plus besoin d'intercepter les clics toi-même ni de distinguer entrant/sortant : le navigateur t'apporte chaque navigation au même endroit.

## L'événement `navigate` : un point d'entrée unique

`navigate` porte tout le contexte de la navigation et te laisse décider si tu la prends en charge. La règle : tester ce que tu **ne dois pas** intercepter, puis appeler `intercept()`.

```js
navigation.addEventListener("navigate", (e) => {
  // On laisse le navigateur faire pour ce qui ne nous regarde pas
  if (!e.canIntercept) return;                    // cross-origin, non interceptable
  if (e.hashChange || e.downloadRequest) return;  // ancre pure, ou téléchargement

  e.intercept({
    async handler() {
      const url = new URL(e.destination.url);
      afficher(await chargerVue(url.pathname));    // le handler peut être async
    },
  });
});
```

Les propriétés utiles de l'événement :

- **`canIntercept`** — `false` pour une navigation cross-origin ou qu'on ne peut pas prendre en charge côté client. À tester **avant** tout `intercept()`.
- **`destination`** — un objet décrivant la cible : `destination.url`, mais aussi `getState()`, `key` et `index`. C'est le « vers où on va ».
- **`hashChange`** — `true` si seul le fragment (`#ancre`) change ; souvent à laisser au navigateur.
- **`downloadRequest`** — le nom de fichier si le lien porte `download` ; non-`null` signifie un téléchargement, à ne pas intercepter.
- **`navigationType`** — `"push" | "replace" | "reload" | "traverse"`, pour distinguer un clic d'un retour.

`intercept({ handler })` dit au navigateur « je gère cette navigation ». Comme le `handler` peut être `async`, le navigateur connaît alors l'état de chargement, expose un `e.signal` (un `AbortSignal`) pour **annuler** si une nouvelle navigation survient entre-temps, et attend la promesse avant de considérer la navigation terminée.

:::callout{type="info"}
`intercept()` accepte aussi `scroll` et `focusReset` (`"after-transition"` / `"manual"`). Par défaut, le navigateur restaure le défilement et déplace le focus **tout seul** une fois le handler résolu — le piège du scroll restoration de l'History API disparaît. Passe en `"manual"` seulement si tu veux vraiment reprendre ces gestes à la main.
:::

## Naviguer et recharger par programme

Pour déclencher une navigation depuis ton code, `navigation.navigate()` remplace le duo `pushState` + `render`.

```js
// Empile une entrée + son état, SANS toucher au DOM :
// c'est le handler de "navigate" ci-dessus qui rendra la vue
navigation.navigate("/produits/7", {
  state: { depuis: "catalogue" },
  history: "push",     // "push" (défaut) | "replace" | "auto"
});

// Rejouer la vue courante en repassant par le même handler
navigation.reload({ state: { rafraichi: true } });
```

La différence de fond avec `pushState` : ici tu **ne rends jamais la vue** toi-même. Tu déclenches une navigation, et ton unique écouteur `navigate` s'en charge — un seul chemin de rendu, quelle que soit l'origine de la navigation. `navigate()` renvoie deux promesses, `{ committed, finished }`, pour attendre respectivement le changement d'URL et la fin du handler.

## Les entrées : un historique enfin inspectable

L'History API ne montre que `history.length` et `history.state` (l'entrée courante, et rien de plus). La Navigation API expose la **liste complète** des entrées same-origin, chacune avec son propre état.

```js
navigation.currentEntry;             // l'entrée active
navigation.currentEntry.getState();  // l'état attaché à CETTE entrée
navigation.entries();                // toute la liste, inspectable

// Modifier l'état de l'entrée courante sans naviguer
navigation.updateCurrentEntry({ state: { onglet: "avis" } });

// Parcourir l'historique par programme
navigation.back();
navigation.forward();
navigation.traverseTo(uneEntree.key); // saut direct vers une entrée précise
```

Chaque entrée porte une **clé stable** (`key`), une `url`, un `index` et son `getState()`. Comme la clé survit aux retours/avances, tu peux mémoriser une position et y revenir d'un seul appel `traverseTo(key)` — impossible avec History, qui ne te laisse que `back()` / `forward()` à l'aveugle, sans jamais voir ce qu'il y a autour.

:::callout{type="tip"}
`updateCurrentEntry()` ne crée pas d'entrée et **ne déclenche pas** `navigate`. C'est le bon outil pour ranger de l'état (défilement, onglet actif) dans l'entrée courante sans polluer l'historique — l'équivalent propre de `replaceState`, mais pour le seul `state`.
:::

## Transitions : le lien avec la View Transitions API

Un `handler` asynchrone laisse l'ancienne vue à l'écran pendant le chargement de la nouvelle. Pour **animer** le passage de l'une à l'autre, enveloppe le rendu dans la View Transitions API.

```js
navigation.addEventListener("navigate", (e) => {
  if (!e.canIntercept || e.hashChange) return;
  e.intercept({
    async handler() {
      const rendre = async () => afficher(await chargerVue(e.destination.url));
      if (!document.startViewTransition) return rendre();  // repli sans animation
      await document.startViewTransition(rendre).finished;
    },
  });
});
```

`navigation.transition` existe **pendant** qu'une navigation interceptée est en cours : il porte le `navigationType`, l'entrée de départ (`from`) et une promesse `finished` — `navigation.transition?.finished.then(() => masquerSpinner())` masque un spinner global à la fin de la navigation.

Ce couplage est naturel : `navigate` te donne le **bon moment** (une navigation unique, déjà gérée côté client), la View Transitions API te donne l'**animation** de l'ancien vers le nouveau DOM. Voir `/web/medior/view-transitions` pour l'API d'animation elle-même.

## Support en 2026 : ce qui est vrai, sans survente

Chromium (Chrome, Edge) gère la Navigation API depuis la **version 102**, mi-2022. Firefox l'a ajoutée en **147** et Safari en **26.2**, début 2026 : l'API est ainsi devenue **Baseline « nouvellement disponible »** en janvier 2026.

Deux nuances à ne pas survoler :

- « Nouvellement disponible » n'est **pas** « largement disponible ». Il faut environ deux ans et demi de support généralisé avant ce second palier. En pratique, une part réelle du parc (anciens Safari, Firefox antérieurs à 147, vieux Chromium) ne connaît pas encore l'API.
- Safari 26.2 gère l'API mais **pas encore le `precommitHandler`** — le hook qui s'exécute avant le changement d'URL, pour charger des données pendant que l'ancienne vue reste visible.

:::callout{type="warn"}
Traite la Navigation API comme une **amélioration progressive**. Teste `"navigation" in window`, garde un routeur History en repli, ou charge un polyfill pour les moteurs sans support. Ne la traite pas comme une dépendance dure tant que ta cible inclut des navigateurs d'avant 2026.
:::

## À retenir

:::cheatsheet
- title: "Événement navigate"
  desc: "Capte TOUTE navigation same-origin (clic, back/forward, navigate()). Un seul point d'entrée."
- title: "event.intercept({ handler })"
  desc: "Prend la main côté client ; handler async, e.signal (AbortSignal) pour annuler."
- title: "canIntercept / hashChange / downloadRequest"
  desc: "À tester avant d'intercepter : cross-origin, ancre pure et téléchargement se laissent au navigateur."
- title: "navigation.navigate(url, { state, history })"
  desc: "Déclenche une navigation ; le handler rend la vue. reload() rejoue la courante."
- title: "entries() / currentEntry / getState()"
  desc: "Historique same-origin inspectable, un état par entrée. Impossible avec History."
- title: "back / forward / traverseTo(key)"
  desc: "Parcourir l'historique ; traverseTo saute directement à une entrée par sa clé stable."
- title: "updateCurrentEntry({ state })"
  desc: "Range de l'état dans l'entrée active sans naviguer ni empiler d'entrée."
- title: "navigation.transition"
  desc: "Navigation en cours (finished, from) ; se marie à la View Transitions API."
- title: "Support 2026"
  desc: "Baseline nouvellement disponible (Chrome/Edge, Firefox 147, Safari 26.2). Pas encore largement dispo : amélioration progressive + polyfill."
:::
