---
title: "<ViewTransition> : les transitions animées"
slug: "view-transition"
framework: "react"
level: "medior"
order: 11
duration: 14
prerequisites: ["suspense-basics"]
updated: 2026-07-08
seoTitle: "React ViewTransition — animer les changements d'état avec l'API View Transitions"
seoDescription: "Le composant <ViewTransition> branche React sur l'API View Transitions du navigateur : animer l'apparition, la disparition et le déplacement d'éléments entre deux états, sans bibliothèque d'animation. Statut, API et pièges."
ogVariant: "gold"
related:
  - { framework: "react", slug: "concurrent-features" }
  - { framework: "css", slug: "transitions" }
---

`<ViewTransition>` trône en tête des fonctionnalités les plus attendues dans les
sondages State of React. Son parti pris : plutôt que de réimplémenter un moteur
d'animation en JavaScript, React se **branche sur l'API View Transitions native**
du navigateur. Tu déclares *quoi* animer, le navigateur anime.

Statut mi-2026 : `<ViewTransition>` et `addTransitionType` sont disponibles
**uniquement dans les canaux Canary et Expérimental** — pas dans React 19.2
stable. L'équipe les juge éprouvés en production (Next.js App Router les expose
derrière le flag `experimental.viewTransition`), mais l'API peut encore changer.

## Le principe

Côté navigateur, une view transition capture un instantané de la page **avant**
la mise à jour, applique le nouveau DOM, capture l'**après**, puis anime la
différence via des pseudo-éléments (`::view-transition-old`,
`::view-transition-new`…). Par défaut : un cross-fade.

Côté React, `<ViewTransition>` ne s'active **que si la mise à jour passe par une
Transition** : un `startTransition` / `useTransition`, la révélation d'un
boundary `<Suspense>` (fallback → contenu), ou `useDeferredValue`. Un `setState`
direct reste instantané, sans animation. Quatre déclencheurs existent : `enter`
(le composant est inséré), `exit` (retiré), `update` (mutation ou déplacement),
`share` (un même `name` disparaît d'un côté et réapparaît de l'autre).

```tsx
import { ViewTransition } from "react"; // canary / experimental uniquement
```

**Pourquoi.** Les Transitions sont non bloquantes et non urgentes : React peut y
préparer tout le nouvel arbre en arrière-plan, puis livrer le DOM final d'un coup
au navigateur, qui a alors un vrai « avant » et un vrai « après » à comparer.
C'est exactement le contrat qu'exige `document.startViewTransition`.

## Premier exemple

Animer l'apparition et la disparition d'un panneau : `enter` et `exit` reçoivent
une **View Transition Class**, une classe CSS que React pose sur les enfants
pendant l'animation. Valeurs possibles : `"auto"` (cross-fade par défaut),
`"none"` (pas d'animation), ou un nom de classe à toi.

```tsx
function Layout({ open }: { open: boolean }) {
  const [, startTransition] = useTransition();
  return open ? (
    <ViewTransition enter="slide-in" exit="slide-out" default="none">
      <aside className="sidebar">…</aside>
    </ViewTransition>
  ) : null;
}
// Le toggle DOIT passer par une Transition :
const toggle = () => startTransition(() => setOpen((o) => !o));
```

```css
::view-transition-new(.slide-in) {
  animation: slide-from-right 300ms ease-out;
}
::view-transition-old(.slide-out) {
  animation: slide-to-right 200ms ease-in;
}
@keyframes slide-from-right { from { transform: translateX(100%); } }
@keyframes slide-to-right   { to   { transform: translateX(100%); } }
```

**Pourquoi.** Le ciblage se fait par classe (`::view-transition-new(.slide-in)`)
et non par nom : React génère les `view-transition-name` automatiquement, tu n'as
pas à en inventer un par élément. `default="none"` évite qu'un simple `update`
(reflow d'un voisin) déclenche un cross-fade parasite sur le panneau.

## L'élément partagé

Le pattern vignette → page détail : donne le **même `name`** aux deux
`<ViewTransition>`. Quand l'un est retiré et l'autre inséré dans la même
Transition, React active `share` et le navigateur interpole position et taille.

```tsx
// Dans la liste :
<ViewTransition name={`product-${product.id}`} share="morph">
  <img src={product.thumb} alt={product.name} />
</ViewTransition>

// Dans la page produit, montée via startTransition :
<ViewTransition name={`product-${product.id}`} share="morph">
  <img src={product.large} alt={product.name} />
</ViewTransition>
```

```css
::view-transition-group(.morph) {
  animation-duration: 350ms;
  animation-timing-function: ease-in-out;
}
```

**Pourquoi.** Un `name` doit être **unique** à un instant donné dans la page,
d'où le suffixe `product.id`. Ne nomme que les éléments réellement partagés :
partout ailleurs, laisse React générer le nom, c'est la recommandation officielle.

## Types de transitions

Une navigation « avant » et un retour « arrière » ne doivent pas glisser dans le
même sens. `addTransitionType` étiquette la Transition en cours, et les props
acceptent un objet `{ type: classe }` avec une clé `default` :

```tsx
import { addTransitionType } from "react";

function navigate(url: string, back = false) {
  startTransition(() => {
    addTransitionType(back ? "nav-back" : "nav-forward");
    setUrl(url);
  });
}
```

```tsx
<ViewTransition
  enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "auto" }}
  exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "auto" }}
>
  <Page url={url} />
</ViewTransition>
```

Pour du contrôle impératif, les callbacks `onEnter`, `onExit`, `onUpdate` et
`onShare` reçoivent `(instance, types)` et permettent d'animer via la Web
Animations API, avec une fonction de cleanup en retour.

## Les pièges

- **Trop animer rend malade.** Réserve les transitions aux changements de
  contexte (navigation, apparition majeure), et neutralise-les pour qui le
  demande :

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

- **Listes longues.** Chaque élément qui participe à la transition coûte un
  instantané bitmap au navigateur. Sur une liste de 500 lignes, réordonner avec
  un `<ViewTransition>` par ligne fait exploser le temps de capture : limite
  l'animation aux éléments visibles, ou mets `default="none"`.
- **Sans prise en charge, rien ne casse.** Si le navigateur n'a pas
  `document.startViewTransition` (Chrome, Edge et Safari l'ont ; Firefox y
  travaille encore mi-2026), React applique la mise à jour sans animation.
  C'est de l'amélioration progressive : aucun fallback à écrire.

:::callout{type="tip"}
Pendant une view transition, la page réelle est recouverte par les instantanés :
les interactions n'atteignent pas l'UI tant que l'animation dure. Mesure ton INP
avant/après — au-delà de ~300 ms d'animation, la réactivité perçue se dégrade.
:::

## À retenir

L'essentiel tient en une phrase : React déclenche `document.startViewTransition`
pour toi quand une mise à jour passe par une Transition, et `<ViewTransition>`
te donne des points d'accroche CSS déclaratifs sur ce mécanisme natif.

:::cheatsheet
- title: "Statut mi-2026"
  desc: "Canary / Experimental uniquement — absent de React 19.2 stable ; API encore susceptible de changer."
- title: "Déclenchement"
  desc: "Uniquement via une Transition : startTransition, useTransition, révélation de Suspense, useDeferredValue."
- title: "Props d'activation"
  desc: "enter, exit, update, share, default — valeurs : \"auto\", \"none\" ou une classe CSS."
- title: "Styler"
  desc: "::view-transition-old(.classe) / ::view-transition-new(.classe) / ::view-transition-group(.classe)."
- title: "Élément partagé"
  desc: "Même prop name des deux côtés dans la même Transition → animation share (morph position/taille)."
- title: "addTransitionType"
  desc: "Étiquette la cause (nav-back…) ; les props acceptent un objet { type: classe, default: … }."
- title: "Dégradation"
  desc: "Navigateur sans l'API : mise à jour appliquée sans animation, rien à prévoir."
:::
