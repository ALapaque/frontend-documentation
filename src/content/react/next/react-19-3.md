---
title: "React 19.3 : ce qui a changé"
slug: "react-19-3"
framework: "react"
level: "next"
order: 1
duration: 15
prerequisites: ["refs-dom", "suspense-basics"]
updated: 2026-09-24
seoTitle: "React 19.3 — ViewTransition stable, Fragment refs, browser() et transitions indépendantes"
seoDescription: "React 19.3 (septembre 2026) stabilise ViewTransition et addTransitionType, introduit les Fragment refs pour piloter un groupe d'éléments sans wrapper, l'API browser() pour les sous-arbres navigateur-only, des transitions qui ne se bloquent plus entre elles et l'intégration Trusted Types."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "view-transition" }
  - { framework: "react", slug: "react-labs" }
---

React n'annonce toujours pas de « v20 » : la feuille de route avance par
**primitives ajoutées aux versions 19.x**. La **19.3**, sortie le 9 septembre
2026, est l'une des plus substantielles de la série — deux fonctionnalités
longtemps expérimentales passent stables, et deux API inédites arrivent.

## `<ViewTransition>` et `addTransitionType` : stables

C'est la nouvelle la plus attendue. Après une longue période en canaux Canary et
Expérimental, `<ViewTransition>` et `addTransitionType` sont **livrés dans le
paquet `react` standard**. Plus de flag, plus de canal spécifique.

```tsx
import { ViewTransition } from "react";   // stable depuis 19.3
```

Le module dédié couvre les déclencheurs (`enter`, `exit`, `update`, `share`), le
fait qu'une transition ne s'active que via `startTransition` / Suspense /
`useDeferredValue`, et les pièges : `/react/medior/view-transition`.

## Fragment refs : piloter un groupe sans wrapper

C'est la vraie nouveauté conceptuelle. Jusqu'ici, pour mesurer, observer ou
focaliser un ensemble d'éléments, il fallait ajouter une `<div>` englobante —
qui pollue le DOM, casse une grille ou un flex, et modifie la mise en page.

Une ref posée sur un `<Fragment>` renvoie désormais une **`FragmentInstance`** :
un objet qui représente les enfants DOM **en tant que groupe**, sans rien ajouter
au DOM.

```tsx
import { Fragment, useRef, useEffect } from "react";

function Groupe({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting) chargerLaSuite();
    });
    ref.current.observeUsing(observer);           // observe tous les enfants
    return () => ref.current.unobserveUsing(observer);
  }, []);

  return <Fragment ref={ref}>{children}</Fragment>;
}
```

La `FragmentInstance` expose un ensemble de méthodes qui agissent sur les enfants
de premier niveau :

- **Focus** : `focus()`, `focusLast()`, `blur()` — parcourent les enfants
  imbriqués en profondeur d'abord.
- **Observation** : `observeUsing()` / `unobserveUsing()` pour brancher un
  `IntersectionObserver` ou un `ResizeObserver`.
- **Mesure et position** : `getClientRects()`, `getRootNode()`,
  `compareDocumentPosition()`, `scrollIntoView()`.
- **Événements** : `addEventListener()`, `removeEventListener()`,
  `dispatchEvent()`.

:::compare
::bad
```tsx
// Un wrapper uniquement pour poser une ref : il entre dans le flux,
// casse le contexte de grille du parent et change la mise en page.
<div ref={ref} style={{ display: "contents" }}>
  <Carte /><Carte /><Carte />
</div>
```
::
::good
```tsx
// Aucun nœud ajouté : la ref porte sur le groupe d'enfants.
<Fragment ref={ref}>
  <Carte /><Carte /><Carte />
</Fragment>
```
::
:::

:::callout{type="tip"}
L'intérêt architectural dépasse le confort : les Fragment refs permettent
d'**attacher un comportement à des composants tiers sans modifier leurs
internes** ni la structure DOM qu'ils produisent. Une bibliothèque de
défilement infini, un gestionnaire de focus ou un outil de mesure peuvent
s'appliquer à des enfants qu'ils ne contrôlent pas.
:::

## `browser()` : des sous-arbres navigateur-only

Certains composants n'ont aucun sens côté serveur : ils lisent le fuseau horaire
local, la largeur de la fenêtre, une valeur du `localStorage`. Le contournement
habituel — un `useEffect` qui bascule un booléen `monte` — provoque un rendu
vide, puis un second rendu, et souvent un avertissement d'hydratation.

```tsx
import { use, Suspense } from "react";
import { browser } from "react-dom";

function FuseauHoraire() {
  use(browser());          // suspend au rendu serveur, passe dans le navigateur
  const fuseau = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <p>{fuseau}</p>;
}

<Suspense fallback="Chargement…">
  <FuseauHoraire />
</Suspense>;
```

**Le mécanisme.** Côté serveur, `use(browser())` **suspend** : c'est le fallback
du `<Suspense>` le plus proche qui part dans le HTML initial. Côté client, il ne
suspend pas et le composant rend normalement. Le sous-arbre est donc déclaré
navigateur-only de façon déclarative, sans effet ni drapeau d'état.

Détail qui compte : `use(browser())` peut être appelé **conditionnellement** ou
après un retour anticipé, ce qu'un Hook classique interdit. Un composant peut
donc se rendre au serveur quand il en a les moyens, et se réserver au navigateur
sinon :

```tsx
function FuseauHoraire({ valeurParDefaut }) {
  if (valeurParDefaut) return <p>{valeurParDefaut}</p>;   // rendu au serveur
  use(browser());                                         // sinon : navigateur
  return <p>{new Intl.DateTimeFormat().resolvedOptions().timeZone}</p>;
}
```

Côté serveur, les API de `react-dom/server` acceptent une option
`onBrowserBailout` pour observer quels sous-arbres ont ainsi été différés — utile
pour mesurer ce qui échappe réellement au rendu serveur.

## Des transitions qui ne se bloquent plus entre elles

Avant la 19.3, plusieurs Transitions en cours étaient **fusionnées en un seul
rendu**. Conséquence : une transition lente retardait toutes les autres, même
sans rapport. Sur un carrousel dont les animations partent dans des directions
différentes, ou sur une page où une navigation coexiste avec un filtre, l'effet
était visible.

Désormais, **chaque Transition est rendue indépendamment**. Une transition lente
n'immobilise plus les mises à jour voisines. Aucun changement de code n'est
nécessaire : c'est un changement de comportement du moteur.

## Trusted Types : React arrête de casser tes policies

L'intégration est discrète mais importante pour les applications durcies. Quand
un site impose `Content-Security-Policy: require-trusted-types-for 'script'`, les
sinks dangereux n'acceptent plus de chaîne brute : il faut leur passer un objet
`TrustedHTML`, `TrustedScript` ou `TrustedScriptURL` produit par une *policy*.

Le problème : React convertissait systématiquement les valeurs en chaîne
(`'' + value`), ce qui **détruisait** l'objet de confiance — le navigateur
rejetait ensuite la valeur. La 19.3 fait passer ces objets tels quels aux API
DOM, et la validation par ta policy fonctionne enfin.

:::callout{type="info"}
Le fond du sujet (policies, `require-trusted-types-for`, réduction de la surface
XSS DOM) est traité dans `/web/senior/security`. La nouveauté ici est seulement
que React cesse d'être un obstacle à leur adoption.
:::

## Le reste, en bref

Une série de corrections et d'ajouts plus discrets méritent d'être connus :

- **Strict Mode** : les effets sont désormais double-invoqués **pendant
  l'hydratation** aussi, pour s'aligner sur les racines rendues côté client. Des
  bugs jusque-là invisibles en SSR peuvent apparaître — c'est le but.
- Un **avertissement de développement** signale un `use()` mal placé dans une
  conditionnelle.
- `useActionState` : les messages d'erreur parlent enfin d'*action state* et non
  plus de *form state*.
- Nouveaux événements DOM `onFullscreenChange` et `onFullscreenError`, propriété
  SVG `maskType`, attribut booléen `credentialless` sur les iframes.
- Les événements `resize` sont **groupés** jusqu'à la frame suivante.
- `onReset` se déclenche à nouveau après une Server Action, et `submitter` est
  exposé dans les événements de soumission.
- Les Server Components peuvent rendre un Context issu d'un module `'use client'`
  sans composant intermédiaire.

:::callout{type="warn"}
Le double-invoquement des effets à l'hydratation est le seul point qui peut
révéler une régression dans une base existante. Si un effet n'est pas idempotent
(abonnement non nettoyé, compteur incrémenté, requête lancée deux fois), il se
manifestera en développement après la montée de version. C'est un révélateur, pas
une cause.
:::

## À retenir

La 19.3 est une release de **consolidation et d'ergonomie** : elle stabilise ce
qui traînait en expérimental depuis deux ans, et comble deux manques structurels
— agir sur un groupe d'éléments sans polluer le DOM, et déclarer proprement qu'un
sous-arbre n'appartient qu'au navigateur. Rien n'oblige à réécrire du code ; tout
invite à en supprimer.

:::cheatsheet
- title: "ViewTransition stable"
  desc: "Avec addTransitionType, dans le paquet react. Fin du canal Canary."
- title: "Fragment refs"
  desc: "Une ref sur <Fragment> renvoie une FragmentInstance : focus, observe, mesure, événements — sans wrapper."
- title: "FragmentInstance"
  desc: "focus/focusLast/blur, observeUsing/unobserveUsing, getClientRects, scrollIntoView, addEventListener."
- title: "use(browser())"
  desc: "Suspend au serveur, rend au client. Exige un <Suspense>. Appelable conditionnellement, contrairement à un Hook."
- title: "Transitions indépendantes"
  desc: "Une transition lente ne bloque plus les autres. Changement de moteur, aucun code à modifier."
- title: "Trusted Types"
  desc: "React ne coerce plus TrustedHTML en chaîne : les policies CSP fonctionnent enfin avec React."
- title: "Strict Mode à l'hydratation"
  desc: "Effets double-invoqués aussi en SSR. Révèle les effets non idempotents — à vérifier à la montée."
:::
