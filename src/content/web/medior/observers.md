---
title: "Les Observers : Intersection, Resize, Mutation, Performance"
slug: "observers"
framework: "web"
level: "medior"
order: 4
duration: 14
prerequisites: ["events"]
updated: 2026-05-23
seoTitle: "Observers du navigateur : IntersectionObserver, ResizeObserver, MutationObserver"
seoDescription: "Comprendre les Observers : lazy-load et scrollspy avec IntersectionObserver sans scroll listener, ResizeObserver et la boucle de resize, MutationObserver, PerformanceObserver, et le pattern observe/disconnect."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
---

Les **Observers** sont une famille d'API qui inverse le contrôle : au lieu d'écouter un flot continu d'événements et de tout recalculer, tu déclares ce qui t'intéresse, et le navigateur te notifie **uniquement quand ça change**. Le gain n'est pas cosmétique : les callbacks d'Observer s'exécutent en dehors du chemin critique de scroll/paint, ce qui supprime une classe entière de jank. Tous partagent la même forme : `new XObserver(callback)`, puis `.observe(cible)`, puis `.disconnect()`.

## IntersectionObserver : la fin des scroll listeners

`IntersectionObserver` notifie quand un élément **entre ou sort** du viewport (ou d'un conteneur). C'est l'outil pour le lazy-load d'images, l'infinite scroll et le scrollspy.

:::compare
::bad
```js
window.addEventListener("scroll", () => {
  for (const img of images) {
    const r = img.getBoundingClientRect(); // force un reflow synchrone
    if (r.top < window.innerHeight) loadImage(img);
  }
});
```
::
::good
```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      loadImage(entry.target);
      io.unobserve(entry.target); // une seule fois
    }
  }
}, { rootMargin: "200px" }); // précharge 200px avant

images.forEach((img) => io.observe(img));
```
::
:::

**Pourquoi.** L'événement `scroll` se déclenche des dizaines de fois par seconde **sur le thread principal**, et chaque `getBoundingClientRect()` force un **reflow synchrone** (le navigateur doit recalculer la géométrie immédiatement). Tu cumules layout thrashing et travail à chaque frame. `IntersectionObserver` calcule l'intersection de façon **asynchrone, hors du thread de scroll**, et ne te réveille qu'au franchissement d'un seuil. Le `rootMargin` agrandit la zone de détection pour précharger.

Les options clés : `threshold` (à quel pourcentage de visibilité notifier) et `root` (le conteneur de référence, `null` = viewport).

## ResizeObserver : observer la taille, pas la fenêtre

`ResizeObserver` notifie quand la **taille d'un élément** change — pas seulement la fenêtre. C'est la base du « container query » impératif : adapter un composant à la place dont il dispose, où qu'il soit placé.

```js
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const w = entry.contentRect.width;
    entry.target.classList.toggle("compact", w < 320);
  }
});
ro.observe(card);
```

### Le piège : la boucle de resize

Si ton callback **modifie la taille** de l'élément observé (ou d'un ancêtre qui le contraint), tu déclenches un nouveau resize, donc un nouveau callback, donc un nouveau resize : boucle infinie. Le navigateur la détecte et coupe en émettant l'erreur `ResizeObserver loop completed with undelivered notifications`.

:::callout{type="warn"}
Dans le callback d'un `ResizeObserver`, **ne modifie pas** une dimension qui réinjecte l'élément observé. Change des classes, du texte, des couleurs — pas une `width`/`height` qui reboucle. Si tu dois redimensionner, vise un autre élément ou découple via un `requestAnimationFrame`.
:::

## MutationObserver : observer le DOM

`MutationObserver` notifie quand le **DOM change** : ajout/suppression de nœuds, changement d'attribut, de texte. Utile pour réagir à du contenu injecté par un tiers ou un éditeur riche. Tu configures précisément ce que tu observes via le second argument de `observe`.

```js
const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "childList") handleAddedNodes(m.addedNodes);
  }
});
mo.observe(container, { childList: true, subtree: true, attributes: false });
```

**Pourquoi l'asynchrone est crucial ici.** Les mutations sont **regroupées** (batchées) et livrées en une fois à la fin de la microtâche courante, pas à chaque modification. Insérer 1000 nœuds dans une boucle ne déclenche pas 1000 callbacks mais un seul, avec un tableau de records. Cela évite de transformer une mutation lourde en avalanche de réentrances.

## PerformanceObserver en bref

`PerformanceObserver` écoute les **entrées de performance** émises par le navigateur : Web Vitals (LCP, CLS, INP), `longtask`, `resource`. C'est la voie recommandée pour le RUM (Real User Monitoring), car elle capture aussi les entrées **arrivées avant** l'abonnement via `buffered: true`.

```js
const po = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) sendMetric(entry);
});
po.observe({ type: "largest-contentful-paint", buffered: true });
```

## Le pattern observe / disconnect : le cleanup

Tous les Observers maintiennent une référence vers leurs cibles. Si tu détruis un composant sans appeler `disconnect()`, l'Observer continue de tourner et **empêche le garbage collector** de libérer les nœuds : fuite mémoire. La règle est symétrique à `addEventListener`/`removeEventListener`.

```js
// Création
const io = new IntersectionObserver(onIntersect);
io.observe(el);

// Destruction du composant
io.disconnect(); // libère TOUTES les cibles
```

`unobserve(cible)` retire une seule cible ; `disconnect()` les retire toutes et arrête l'Observer. Dans un framework, branche `disconnect()` sur le hook de démontage (`onUnmounted`, `useEffect` cleanup, `disconnectedCallback`).

:::cheatsheet
- title: "IntersectionObserver"
  desc: "visibilité dans le viewport : lazy-load, infinite scroll, scrollspy"
- title: "ResizeObserver"
  desc: "taille d'un élément ; attention à la boucle de resize"
- title: "MutationObserver"
  desc: "changements du DOM, livrés batchés en microtâche"
- title: "PerformanceObserver"
  desc: "Web Vitals et entrées de perf, avec buffered: true"
- title: "disconnect()"
  desc: "toujours nettoyer au démontage pour éviter la fuite mémoire"
:::
