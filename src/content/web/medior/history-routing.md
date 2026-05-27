---
title: "History, URL et routing côté client"
slug: "history-routing"
framework: "web"
level: "medior"
order: 6
duration: 15
prerequisites: ["events"]
updated: 2026-05-23
seoTitle: "Routing SPA : History API, URL, URLSearchParams et Navigation API"
seoDescription: "Comprendre le routing côté client : pushState/replaceState/popstate, l'objet URL et URLSearchParams, comment un routeur SPA s'appuie dessus, la Navigation API 2026, le piège du bouton retour et du scroll restoration."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
---

Une Single Page Application change ce que voit l'utilisateur **sans recharger la page**. Pour que l'URL reste cohérente (partageable, ajoutable aux favoris, compatible avec le bouton retour), il faut manipuler l'historique du navigateur par programme. Tout le routing client repose sur deux mécanismes : l'**History API**, qui réécrit l'URL sans navigation réseau, et un **observateur** qui détecte les changements pour rendre la bonne vue. Mal câblés, ils cassent le bouton retour, le partage de lien et la position de défilement.

## History API : changer l'URL sans recharger

`history.pushState(state, "", url)` **ajoute** une entrée dans l'historique et met à jour la barre d'adresse — sans aucune requête réseau ni rechargement. `history.replaceState(...)` fait pareil mais **remplace** l'entrée courante au lieu d'en empiler une nouvelle.

```js
// L'utilisateur ouvre un panneau : on veut une URL partageable, et un retour possible
history.pushState({ panelId: 7 }, "", "/produits/7");

// On corrige juste un paramètre sans polluer l'historique : replaceState
history.replaceState({ tab: "avis" }, "", "?tab=avis");
```

Le premier argument, `state`, est un objet **sérialisé** par le navigateur (clonage structuré) et restitué plus tard. C'est là qu'on range l'état nécessaire pour reconstruire la vue (scroll, identifiant, filtres).

## popstate : réagir au bouton retour

Ni `pushState` ni `replaceState` ne déclenchent d'événement. En revanche, quand l'utilisateur **navigue dans l'historique** (boutons précédent/suivant, `history.back()`), le navigateur émet `popstate` avec l'objet `state` mémorisé. C'est le signal central d'un routeur.

:::compare
::bad
```js
function go(url) {
  history.pushState(null, "", url);
  render(url); // on rend la vue ici, et on croit que c'est fini
}
// L'utilisateur clique sur "retour" : l'URL change, mais render() n'est jamais
// rappelé -> l'écran reste figé sur l'ancienne vue. Bouton retour cassé.
```
::
::good
```js
function go(url) {
  history.pushState(null, "", url);
  render(url);
}
// Le retour/avance émet popstate : on re-rend la vue à partir de l'URL courante
window.addEventListener("popstate", () => render(location.pathname));
```
::
:::

**Pourquoi.** À gauche, on confond « changer l'URL » et « être notifié d'un changement d'URL ». `pushState` est silencieux par conception : il ne rappelle pas ton code. Quand l'utilisateur appuie sur retour, le navigateur dépile l'historique et met à jour `location`, mais ta fonction `render` n'est jamais réinvoquée — l'affichage et l'URL divergent. À droite, on sépare les deux directions : les navigations **sortantes** (clics dans l'app) appellent `pushState` + `render` à la main, et les navigations **entrantes dans l'historique** (retour/avance) sont captées par `popstate`, seul événement que le navigateur émet pour ce cas. C'est cette boucle qui rend le bouton retour fonctionnel.

## L'objet URL et URLSearchParams

Construire une URL à la main par concaténation de strings est une source de bugs (encodage, doubles `?`, `&` oubliés). L'objet `URL` la **parse** et expose chaque partie ; `URLSearchParams` gère la query string proprement, avec encodage automatique.

```js
const url = new URL(location.href);
url.searchParams.set("page", "2");      // ajoute ou remplace
url.searchParams.delete("filtre");
url.searchParams.get("tri");            // null si absent
history.pushState(null, "", url);       // on passe l'objet URL directement
```

`URLSearchParams` est aussi **itérable** (`for...of`, `entries()`) et encode les caractères spéciaux (`&`, espaces, accents) pour toi. Ne reconstruis jamais une query string toi-même.

:::callout{type="info"}
`location.pathname`, `location.search` et `location.hash` te donnent les morceaux de l'URL courante en lecture seule pratique. Pour les modifier proprement et reconstruire une URL valide, passe par `new URL(location.href)` et ses `searchParams` plutôt que d'assembler des chaînes.
:::

## Comment un routeur SPA s'appuie là-dessus

Un routeur client n'est qu'une fine couche au-dessus de ces primitives. Sa logique tient en trois rôles :

1. **Intercepter** les clics sur les liens internes : un listener (souvent délégué sur `document`) appelle `preventDefault()` puis `pushState`, pour éviter le rechargement complet du navigateur.
2. **Faire correspondre** (`match`) le `location.pathname` à une vue, via une table de routes ou des motifs (`URLPattern` en 2026).
3. **Re-rendre** la vue, à la fois sur navigation sortante et sur `popstate`.

```js
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.origin !== location.origin) return; // liens externes : on laisse faire
  e.preventDefault();
  history.pushState(null, "", a.href);
  render(location.pathname);
});
```

Côté serveur, il faut une **réécriture** (fallback vers `index.html`) pour que `/produits/7` chargé directement renvoie l'app, sinon le serveur cherche un fichier inexistant et renvoie 404.

## La Navigation API : le successeur moderne

L'History API a deux faiblesses : `popstate` ne couvre **que** les navigations dans l'historique (pas les navigations sortantes), et il n'expose aucun moyen propre d'intercepter une navigation ni d'attendre une transition asynchrone. La **Navigation API** (largement disponible en 2026) corrige cela avec un seul événement, `navigate`, qui capte **toutes** les navigations same-origin.

```js
navigation.addEventListener("navigate", (e) => {
  if (!e.canIntercept || e.hashChange) return;
  e.intercept({
    async handler() {
      const data = await chargerVue(new URL(e.destination.url).pathname);
      afficher(data); // la transition peut être asynchrone, gérée par l'API
    },
  });
});
```

`e.intercept({ handler })` dit au navigateur « je gère cette navigation côté client » ; le handler peut être `async`, et l'API expose un état de chargement et l'annulation. Plus besoin d'intercepter les clics à la main ni de jongler entre `pushState` et `popstate` : un seul point d'entrée.

## Le piège du scroll restoration

Quand l'utilisateur revient en arrière, il s'attend à **retrouver sa position de défilement**. Par défaut, `history.scrollRestoration` vaut `"auto"` et le navigateur restaure le scroll — mais dans une SPA, le contenu est rendu **après** la navigation (de façon asynchrone), donc le navigateur restaure le scroll sur une page encore vide, et tu te retrouves en haut.

:::callout{type="warn"}
Dans une SPA, passe `history.scrollRestoration = "manual"` pour reprendre le contrôle. Sauvegarde `scrollY` dans l'objet `state` (ou un store) **avant** chaque `pushState`, puis restaure-le **après** que la vue est rendue. Sinon le bouton retour ramène toujours en haut de page, même si le contenu logique était plus bas. La Navigation API gère mieux ce cas, mais le réflexe reste de découpler restauration et rendu.
:::

## À retenir

:::cheatsheet
- title: "pushState / replaceState"
  desc: "change l'URL sans recharger ; push empile, replace remplace l'entrée courante"
- title: "popstate"
  desc: "seul événement émis sur retour/avance ; pushState est silencieux"
- title: "URL + URLSearchParams"
  desc: "parser et modifier l'URL proprement, avec encodage automatique"
- title: "Routeur SPA"
  desc: "intercepter les clics, matcher le pathname, re-rendre sur sortie et popstate"
- title: "Navigation API"
  desc: "événement navigate unique, intercept() asynchrone : successeur de History"
- title: "scrollRestoration"
  desc: "passe en manual dans une SPA pour restaurer le scroll après le rendu"
:::
