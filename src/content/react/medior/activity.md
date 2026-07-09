---
title: "<Activity> : masquer sans démonter"
slug: "activity"
framework: "react"
level: "medior"
order: 12
duration: 13
prerequisites: ["effects-basics", "suspense-basics"]
updated: 2026-07-08
seoTitle: "React Activity — préserver l'état et le DOM d'une UI cachée (tabs, navigation)"
seoDescription: "<Activity mode=\"hidden\"> cache un sous-arbre en préservant son état et son DOM : les onglets qui ne perdent plus leur scroll, le back instantané, le pré-rendu des vues probables. Comment ça marche, les effets, et quand l'utiliser."
ogVariant: "gold"
related:
  - { framework: "react", slug: "use-effect-event" }
  - { framework: "react", slug: "suspense-basics" }
---

Le dilemme classique des onglets : quand l'onglet devient inactif, soit tu le
**démontes** — état local perdu, re-fetch au retour, position de scroll envolée —
soit tu bricoles un `display: none` à la main — l'état survit, mais les effets
continuent de tourner en arrière-plan, et le focus comme l'accessibilité
deviennent bancals. `<Activity>`, **stable depuis React 19.2**, tranche : le
sous-arbre est caché **mais préservé**, et React coupe proprement les effets.

## L'API

`<Activity>` s'importe depuis `react` et prend une seule prop, `mode` :
`"visible"` (défaut) ou `"hidden"`. En `hidden`, React masque les enfants via
`display: none`, **préserve leur état et leur DOM**, mais **démonte leurs
effets**. Au retour en `visible`, tout réapparaît tel quel et les effets sont
re-créés.

```tsx
import { Activity, useState } from "react";

function Onglets() {
  const [actif, setActif] = useState("stats");
  return (
    <>
      <BarreOnglets actif={actif} onSelect={setActif} />
      <Activity mode={actif === "stats" ? "visible" : "hidden"}>
        <Stats />
      </Activity>
      <Activity mode={actif === "logs" ? "visible" : "hidden"}>
        <Logs /> {/* scroll, filtres, brouillon : tout survit */}
      </Activity>
    </>
  );
}
```

**Pourquoi.** Sans `<Activity>`, changer d'onglet détruit le sous-arbre : chaque
retour repart de zéro (state, DOM, `<textarea>` à moitié rempli, timecode d'une
vidéo). Ici, React garde les fibers et le DOM en vie ; conceptuellement les
enfants sont « démontés » (leurs effets sont nettoyés), mais leur état est mis de
côté pour plus tard. Nuance importante : caché ≠ figé — le sous-arbre continue de
recevoir les nouvelles props et se re-rend, simplement à plus basse priorité.

## Les effets sous Activity

C'est la vraie différence avec un `display: none` artisanal. Quand le sous-arbre
passe en `hidden`, React exécute les **cleanups** de tous ses effets
(souscriptions fermées, intervalles arrêtés), puis les ré-exécute au retour en
`visible`. Exactement le cycle que tu écrirais à la main… sans l'écrire.

:::compare
::bad
```tsx
// keep-alive maison : caché au sens CSS, monté au sens React
function Panneau({ visible, children }) {
  return <div style={{ display: visible ? "block" : "none" }}>{children}</div>;
}

function Stats() {
  useEffect(() => {
    const id = setInterval(rafraichirStats, 5000); // tourne aussi caché !
    return () => clearInterval(id);
  }, []);
  return <Graphique />;
}
```
::
::good
```tsx
<Activity mode={visible ? "visible" : "hidden"}>
  <Stats />
</Activity>
// passage en hidden → React appelle clearInterval (cleanup),
// retour en visible → l'effet est re-monté. Zéro code en plus.
```
::
:::

**Pourquoi.** Dans la version maison, React ne sait pas que le panneau est caché :
l'intervalle poll un graphique invisible, les WebSockets restent ouvertes, les
listeners s'accumulent. `<Activity>` donne à React l'information de visibilité,
et il en déduit le cycle de vie des effets — c'est le contrat « un effet actif
seulement quand l'UI est réellement là ».

:::callout{type="info"}
Le DOM caché, lui, persiste — et ses effets de bord aussi : une `<video>` en
cours de lecture continue de jouer sous `display: none`. Mets-la en pause dans un
cleanup (`useLayoutEffect`) si nécessaire. Autre cas limite documenté : un enfant
qui ne rend **que du texte** n'affiche rien en `hidden`, faute d'élément DOM sur
lequel appliquer le masquage.
:::

## Cas d'usage

- **Onglets et wizards** : le formulaire de l'étape 2 garde ses champs et son
  scroll pendant que l'utilisateur consulte l'étape 3.
- **Back/forward instantané dans une SPA** : garde la page quittée en `hidden`
  au lieu de la démonter ; le retour restaure état et position sans re-fetch.
- **Pré-rendu à bas coût d'une vue probable** : monte-la d'avance en `hidden` —
  React la rend en arrière-plan sans monter ses effets, et les sources Suspense
  (`use` sur une promesse cachée, `lazy`, frameworks compatibles) chargent déjà
  leurs données. Au clic, l'affichage est quasi instantané.

```tsx
<Activity mode="hidden">
  <PageProbablementSuivante /> {/* pré-rendue, effets non montés */}
</Activity>
```

Attention pour le pré-rendu : seules les sources **compatibles Suspense** sont
récupérées d'avance. Un fetch lancé dans un `useEffect` ne partira pas — les
effets ne tournent pas tant que le sous-arbre est caché.

## Priorité et performance

Le rendu des arbres cachés est **dépriorisé** : React ne s'en occupe que
lorsqu'il n'a rien de plus urgent, donc un `hidden` volumineux n'affame pas
l'UI visible. En revanche, la mémoire, elle, ne se déprioritise pas : fibers,
state et DOM de chaque sous-arbre caché restent alloués.

:::callout{type="warn"}
Ne garde pas quinze vues montées « au cas où ». Réserve `hidden` aux sous-arbres
que l'utilisateur a une vraie probabilité de revoir (onglet récent, page
précédente, étape suivante) et démonte le reste normalement. Un keep-alive
généralisé, c'est une fuite mémoire avec un joli nom.
:::

## Ce que ça remplace (et pas)

- **Le keep-alive maison** (`display: none`, caches de composants) : remplacé,
  en mieux — même préservation, mais avec des effets correctement coupés et un
  rendu de fond pris en charge par le scheduler.
- **Le state hoisting défensif** : remonter l'état d'un onglet dans un parent ou
  un store *uniquement* pour survivre au démontage n'a plus de raison d'être.
  Garde le hoisting pour l'état réellement partagé.
- **Pas du storage** : `<Activity>` vit dans l'arbre React. Un refresh, une
  navigation dure ou le démontage du `<Activity>` lui-même effacent tout. Pour
  persister au-delà, il te faut toujours une URL, un store ou du storage.

## À retenir

:::cheatsheet
- title: "API"
  desc: "<Activity mode=\"visible\" | \"hidden\"> (défaut : visible), stable depuis React 19.2."
- title: "hidden = préservé"
  desc: "État et DOM conservés, masquage via display:none ; retour en visible à l'identique."
- title: "Effets démontés"
  desc: "Passage en hidden → cleanups exécutés ; retour en visible → effets re-créés."
- title: "Pas figé"
  desc: "Le sous-arbre caché se re-rend sur nouvelles props, à plus basse priorité."
- title: "Pré-rendu"
  desc: "hidden dès le premier rendu = préchargement des sources Suspense, sans effets."
- title: "Limites"
  desc: "Coût mémoire par vue gardée ; ne survit pas au refresh — pas un remplaçant du storage."
:::
