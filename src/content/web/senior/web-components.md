---
title: "Web Components : custom elements et Shadow DOM"
slug: "web-components"
framework: "web"
level: "senior"
order: 5
duration: 15
prerequisites: []
updated: 2026-05-23
seoTitle: "Web Components : custom elements, Shadow DOM, slots et interop"
seoDescription: "Comprends les custom elements et leurs lifecycle callbacks, l'encapsulation du Shadow DOM, les slots et templates, le declarative shadow DOM, quand préférer un framework, l'interop, l'accessibilité et le FOUC."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "core-web-vitals" }
---

## Ce que sont les Web Components

« Web Components » désigne trois API du navigateur, indépendantes mais conçues pour s'assembler : les **custom elements** (définir tes propres balises `<x-truc>`), le **Shadow DOM** (un sous-arbre DOM encapsulé, isolé du document), et l'élément **`<template>`** (du markup inerte clonable). Leur intérêt n'est pas de remplacer ton framework : c'est d'offrir des composants **portables et durables**, qui fonctionnent dans n'importe quelle page sans runtime, parce qu'ils s'appuient sur la plateforme elle-même.

Le cas d'usage canonique : un design system qui doit vivre dans React, dans une page Rails, dans du WordPress et dans dix ans. Un `<ds-button>` natif n'a pas de dépendance de version ni de bundle à charger. C'est aussi pourquoi les widgets embarquables tiers (lecteurs vidéo, chatbots) sont souvent des Web Components : ils s'isolent du CSS de l'hôte.

## Custom elements et lifecycle callbacks

Un custom element est une classe qui étend `HTMLElement`, enregistrée via `customElements.define('mon-element', MaClasse)`. Le nom **doit contenir un tiret** — c'est ce qui garantit qu'il n'entrera jamais en collision avec un futur élément standard. Le navigateur appelle alors des **lifecycle callbacks** à des moments précis :

```js
class CountBadge extends HTMLElement {
  static observedAttributes = ['count'];

  connectedCallback() {
    // appelé à chaque insertion dans le DOM : c'est ICI qu'on rend
    this.render();
  }
  disconnectedCallback() {
    // retrait du DOM : libère listeners, observers, timers
  }
  attributeChangedCallback(name, oldVal, newVal) {
    // appelé seulement pour les attributs déclarés dans observedAttributes
    if (oldVal !== newVal) this.render();
  }
  render() {
    this.textContent = this.getAttribute('count') ?? '0';
  }
}
customElements.define('count-badge', CountBadge);
```

Le piège : ne **jamais** toucher au DOM dans le `constructor`. Au moment de la construction, l'élément peut ne pas encore être attaché et ses attributs/enfants peuvent ne pas être parsés. Le constructeur sert à initialiser l'état interne et, au plus, à attacher le shadow root. Tout le rendu va dans `connectedCallback`, et `disconnectedCallback` doit défaire ce que `connectedCallback` a branché — sinon tu fuis des listeners à chaque insertion/retrait.

:::compare
::bad
```js
class MyTimer extends HTMLElement {
  connectedCallback() {
    // setInterval jamais nettoyé : fuite à chaque retrait/réinsertion
    setInterval(() => this.tick(), 1000);
    window.addEventListener('resize', this.onResize);
  }
}
```
::
::good
```js
class MyTimer extends HTMLElement {
  connectedCallback() {
    this._id = setInterval(() => this.tick(), 1000);
    this._onResize = () => this.layout();
    window.addEventListener('resize', this._onResize);
  }
  disconnectedCallback() {
    clearInterval(this._id);
    window.removeEventListener('resize', this._onResize);
  }
}
```
::
:::

**Pourquoi.** Un custom element peut être retiré puis réinséré (déplacement DOM, navigation côté client, virtualisation de liste) ; chaque insertion **rejoue** `connectedCallback`. Si tu y crées un `setInterval` ou un listener global sans le défaire dans `disconnectedCallback`, ils s'accumulent : N réinsertions = N timers actifs et N abonnements `resize`, même sur des éléments détachés que le GC ne peut pas collecter tant que `window` les référence. C'est une fuite mémoire et une dégradation de perf progressives. La symétrie `connected`/`disconnected` est le contrat à respecter, exactement comme un cleanup d'effet.

## Shadow DOM : encapsulation du style et du DOM

`this.attachShadow({ mode: 'open' })` crée un **shadow root** : un sous-arbre dont le DOM et le CSS sont **isolés du document hôte**. Les styles définis dedans ne fuient pas vers la page, et le CSS de la page ne traverse pas la frontière (sauf les propriétés héritées comme `color`/`font`, et les **custom properties** qui, elles, percent volontairement). C'est l'encapsulation forte qui rend un composant réellement réutilisable : tu ne crains plus qu'un `.button` global écrase ton bouton.

```js
class DsButton extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        button { font: inherit; padding: .5em 1em;
                 background: var(--ds-accent, #6b21a8); color: #fff; }
      </style>
      <button><slot></slot></button>`;
  }
}
customElements.define('ds-button', DsButton);
```

Le `<slot>` est le mécanisme de **projection** : le contenu en *light DOM* (les enfants que l'auteur écrit entre `<ds-button>…</ds-button>`) est projeté à l'emplacement du slot. Tu peux nommer plusieurs slots (`<slot name="icon">`) pour des zones distinctes. La porte d'API de style entre l'hôte et le composant, ce sont les **custom properties** (`--ds-accent`) et les pseudo-éléments `::part()` que tu exposes explicitement — pas un accès libre à tout le CSS interne.

## `<template>` et declarative shadow DOM

`<template>` contient du markup **inerte** : non rendu, ses scripts ne s'exécutent pas, ses images ne se chargent pas, jusqu'à ce que tu clones son `.content` via `cloneNode(true)`. C'est la primitive idéale pour instancier rapidement une structure répétée sans reparser du HTML à chaque fois.

Le grand manque historique des Web Components était le rendu serveur : un shadow root ne s'attachait qu'en JS, donc le contenu encapsulé n'existait pas dans le HTML initial — mauvais pour le SSR, le SEO et le LCP. C'est résolu par le **Declarative Shadow DOM** (DSD), désormais stable dans tous les moteurs en 2026 :

```html
<ds-card>
  <template shadowrootmode="open">
    <style>:host { display: block; border: 1px solid #ddd; }</style>
    <slot></slot>
  </template>
  Contenu projeté
</ds-card>
```

Le navigateur attache le shadow root **dès le parsing HTML**, sans JavaScript. Tu peux donc rendre tes Web Components côté serveur, les afficher immédiatement, puis « hydrater » le comportement quand le JS arrive (ou jamais, pour un composant purement présentationnel).

:::callout{type="warn"}
Sans Declarative Shadow DOM, un Web Component rendu uniquement en JS produit un **FOUC** (Flash of Unstyled Content) : le navigateur affiche d'abord le light DOM brut, sans les styles du shadow root, jusqu'à l'exécution de la définition. Sur un custom element non encore *upgraded*, c'est pire — il s'affiche comme un conteneur inconnu. Réserve de l'espace via du CSS sur l'élément hôte (`ds-card { display:block; min-height: … }`) ou utilise `:defined` (`ds-card:not(:defined) { visibility: hidden }`) pour masquer jusqu'à la définition, et privilégie le DSD dès que le SSR compte.
:::

## Accessibilité et interop framework

L'**accessibilité** est le point faible le plus sous-estimé. Le Shadow DOM crée une frontière que certaines relations ARIA ne traversent **pas** : un `aria-labelledby` du light DOM ne peut pas pointer vers un `id` à l'intérieur d'un shadow root, et inversement. Pour un contrôle de formulaire custom, tu dois implémenter le pattern *form-associated custom element* (`static formAssociated = true` + `ElementInternals`), qui expose rôle, valeur et état au formulaire et à l'arbre d'accessibilité. Ne te contente pas d'un `<div>` stylé : un Web Component interactif a les mêmes obligations de rôle/nom/état que n'importe quel composant.

Côté **interop framework** : les Web Components passent les **attributs** (toujours des strings) sans souci, mais les frameworks diffèrent sur les **propriétés** et les **événements**. Historiquement, React traitait tout comme attribut et ne savait pas attacher d'événements custom déclarativement ; c'est corrigé depuis React 19 qui gère propriétés et événements custom nativement. Règle pratique : expose des **attributs** pour les données simples, des **propriétés** pour les objets/tableaux (un attribut ne peut pas porter un objet), et émets des `CustomEvent` pour communiquer vers le haut.

## Web Components ou framework ?

Ce ne sont pas des concurrents au même niveau. Les Web Components sont un modèle de **composant** (encapsulation, distribution), pas un modèle d'**application** : ils n'apportent ni rendu réactif déclaratif, ni gestion d'état, ni routing, ni diffing efficace. Écrire une SPA entière en custom elements « à la main » te fait réimplémenter ce qu'un framework fait mieux.

Choisis les Web Components pour : un design system multi-techno, des widgets embarquables qui doivent s'isoler du CSS hôte, ou des îlots interactifs dans des pages majoritairement statiques. Reste sur ton framework (ou combine via des libs comme **Lit**, qui ajoutent réactivité et templating au-dessus du standard) pour la logique applicative. Beaucoup d'équipes font les deux : composants de base en Web Components portables, application assemblée dans le framework.

:::cheatsheet
- title: "Nom avec tiret"
  desc: "customElements.define('x-truc', …) : le tiret évite toute collision future."
- title: "Pas de DOM au constructeur"
  desc: "Initialise l'état/le shadow root ; rends dans connectedCallback."
- title: "connected/disconnected symétriques"
  desc: "Tout listener ou timer branché doit être défait au retrait, sinon fuite."
- title: "observedAttributes"
  desc: "attributeChangedCallback ne se déclenche que pour les attributs déclarés."
- title: "Shadow DOM isole"
  desc: "Style/DOM encapsulés ; API publique = custom properties et ::part()."
- title: "slot = projection"
  desc: "Le light DOM de l'auteur est projeté dans <slot>, nommé ou non."
- title: "Declarative Shadow DOM"
  desc: "<template shadowrootmode> attache le shadow au parsing : SSR sans JS."
- title: "A11y = ElementInternals"
  desc: "Form-associated + ElementInternals pour exposer rôle/valeur/état."
- title: "Composant, pas application"
  desc: "Pour un design system portable ; le framework gère état/routing/réactivité."
:::
