---
title: "Micro-frontends : quand, et surtout pourquoi pas"
slug: "micro-frontends"
framework: "architecture"
level: "senior"
order: 5
duration: 16
prerequisites: ["hexagonal-clean"]
updated: 2026-07-09
seoTitle: "Micro-frontends — Module Federation, intégration et le vrai coût organisationnel"
seoDescription: "Les micro-frontends résolvent un problème d'ORGANISATION, pas de technique : livrer indépendamment à plusieurs équipes. Module Federation, les modes d'intégration, et une évaluation honnête des coûts qui les rendent rarement justifiés."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "hexagonal-clean" }
  - { framework: "architecture", slug: "monorepo" }
---

Les **micro-frontends** sont vendus comme « les microservices du front ». C'est un raccourci trompeur. Ils résolvent d'abord un problème d'**organisation** — plusieurs équipes qui veulent livrer sans se bloquer — pas un problème technique. Les adopter pour la technique seule, c'est acheter une complexité énorme sans le bénéfice qui la justifie. Cet article est donc autant un guide qu'un avertissement : la bonne question n'est presque jamais *comment*, c'est *si*.

## Le vrai problème résolu

Un micro-frontend, c'est une **frontière de déploiement** dans le navigateur : un bout d'interface qu'une équipe construit, teste et met en production **sans attendre les autres**. Le mot important est *déploiement*, pas *code*. Découper du code, tu sais déjà le faire avec des modules et des dossiers. Ce que les micro-frontends ajoutent, c'est le droit pour l'équipe Paiement de livrer un mardi pendant que l'équipe Catalogue dort.

Ça renvoie directement à la **loi de Conway** : un système finit par copier la structure de communication de l'organisation qui le produit. Si tu as huit équipes autonomes, avec des rythmes, des roadmaps et parfois des stacks différents, une seule build monolithique devient un point de contention — tout le monde attend la fenêtre de release de tout le monde. Les micro-frontends alignent l'architecture technique sur cette réalité humaine.

:::callout{type="info"}
La conséquence tient en une phrase. **Si tu as une seule équipe, tu n'as pas besoin de micro-frontends.** Le bénéfice — l'indépendance de déploiement entre équipes — n'existe pas quand il n'y a personne à découpler. Tu ne récoltes que les coûts.
:::

## Les approches d'intégration

« Micro-frontend » ne désigne pas une technologie mais une famille d'approches. Elles se classent surtout par le **moment** où les morceaux se rejoignent.

- **Build-time (paquets)** : chaque équipe publie un paquet npm, le shell l'installe et le compile. Le plus simple, le mieux outillé, typé de bout en bout. Mais le couplage se fait au build : mettre à jour un morceau oblige à **réexécuter** le build et redéployer le shell. Ce n'est donc *pas* du déploiement indépendant — c'est un monolithe modulaire déguisé.
- **Run-time via Module Federation** : le shell charge le code d'une autre app **au moment de l'exécution**, dans le navigateur, et partage les dépendances communes. C'est la seule approche qui offre un vrai déploiement indépendant sans rebuild du shell. C'est aussi la plus complexe.
- **Edge-side includes (ESI) / server-side composition** : un serveur ou un CDN assemble des fragments HTML produits par différentes apps avant de renvoyer la page. Bon pour le contenu majoritairement statique et le SEO, moins pour les interfaces riches très interactives.
- **Web components** : chaque équipe expose un *custom element* (`<checkout-cart>`). Neutre vis-à-vis du framework, standard du navigateur. En pratique le partage d'état, le style et le SSR restent délicats.
- **iframe** : l'isolation la plus forte qui existe (CSS, JS, crash contenus). Le prix : communication par `postMessage`, routing et responsive pénibles, accessibilité fragile. Réservé aux cas où l'isolation prime tout (widgets tiers, back-offices legacy).

:::callout{type="tip"}
Ordre de préférence honnête, du moins au plus coûteux : **build-time → web components → Module Federation → iframe**. Ne monte pas d'un cran sans une raison d'organisation qui l'exige. Chaque cran ajoute une facture permanente.
:::

## Module Federation, concrètement

C'est le mécanisme run-time de référence. Depuis **Module Federation 2.0** (stable en 2026), le runtime est découplé du bundler : au-delà de webpack, il gère **Rspack** (via `@module-federation/enhanced`) et **Vite/Rollup** (via `@module-federation/vite`), avec en prime le partage de types TypeScript et une découverte dynamique par manifeste. Rspack, compatible avec l'API webpack mais bien plus rapide au build, est devenu le chemin de migration le plus courant.

Le vocabulaire tient en trois mots. Un **remote** *expose* des modules ; un **host** les *consomme* ; `shared` déduplique les dépendances communes.

```js
// remote — l'équipe Paiement expose son panier
new ModuleFederationPlugin({
  name: 'checkout',
  exposes: { './Cart': './src/Cart' },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true },
  },
});
```

```js
// host (shell) — il pointe vers le manifeste du remote
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { checkout: 'checkout@https://checkout.example.com/mf-manifest.json' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
```

```ts
// dans le shell : le code du remote est chargé au runtime
const Cart = React.lazy(() => import('checkout/Cart'));
```

`singleton: true` est la clé : il force **une seule instance** de React pour tout le monde. Sans ça, deux copies de React cohabitent, les hooks cassent, et le bundle double. Ce petit drapeau résume à lui seul toute la difficulté des micro-frontends : le partage de dépendances est un contrat fragile entre équipes.

## Les coûts durs

C'est le cœur de l'article, et la partie que la hype escamote. Ces coûts ne sont pas des détails d'implémentation : ce sont des **problèmes de systèmes distribués** que tu importes dans le navigateur.

:::callout{type="warn"}
**Versions de dépendances partagées.** Le remote veut React 19, le host est bloqué sur React 18. `singleton` exige une version compatible partout, à la runtime, sans le filet du compilateur. Une montée de version majeure devient une négociation entre équipes, pas un `npm update`.

**Duplication de bundle.** Chaque remote qui ne réussit pas à partager une dépendance l'embarque en double. L'utilisateur télécharge deux fois `date-fns`, trois fois un state manager. Le budget de perf fond sans que personne ne le voie dans son app isolée.

**Cohérence du design system.** Boutons, tokens, espacements : sans discipline féroce, chaque équipe dérive et l'interface assemblée ressemble à un patchwork. Le design system doit être versionné, partagé et gouverné — une équipe de plus à financer.

**Routing inter-apps.** Qui possède l'URL ? Le shell route vers les remotes, les remotes ont leur routing interne, et l'historique du navigateur, les deep links et le back button doivent rester cohérents à travers des apps qui s'ignorent.

**Débogage distribué.** Un bug à la frontière traverse deux dépôts, deux équipes, deux pipelines. La stack trace pointe vers du code chargé dynamiquement que ton IDE ne connaît pas. Le « ça marche chez moi » devient structurel.

**Performance et disponibilité.** Charger un remote, c'est une requête réseau de plus, qui peut être lente, échouer ou renvoyer une version incompatible. Il faut des *error boundaries*, des fallbacks et un plan quand `checkout.example.com` tombe pendant que ton shell tient.

**Gouvernance.** Versions partagées, tokens, propriété des error boundaries, qui *rollback* quand un remote casse la prod : si l'organisation ne sait pas répondre à ces questions par écrit, elle n'est pas prête. Le coût le plus lourd n'est pas dans le code, il est dans les réunions.
:::

## Les alternatives, avant d'en arriver là

La plupart des équipes qui *croient* avoir besoin de micro-frontends ont en fait un problème de **découpage de code**, que des solutions bien plus légères règlent sans frontière de déploiement.

- **Monorepo + modules bien délimités.** Un seul dépôt, plusieurs paquets, des frontières claires imposées par des règles de lint et de dépendances. Tu gagnes l'isolation du code et la propriété par équipe **sans** la complexité runtime. Voir [monorepo](/architecture/medior/monorepo).
- **Une seule SPA bien découpée.** Lazy loading par route, un cœur métier isolé des adapteurs UI (voir [hexagonal-clean](/architecture/senior/hexagonal-clean)) : tu obtiens 90 % des bénéfices structurels avec 10 % du coût opérationnel.
- **Import maps.** Standard web natif, sans runtime propriétaire. Si tes « micro-frontends » ne sont en vrai que quelques modules ES versionnés indépendamment, le navigateur résout lui-même les spécificateurs vers des URLs versionnées.

:::compare
::bad
```text
« Nos builds sont lents et le code est emmêlé,
  donc on passe en micro-frontends. »
→ problème technique traité par une solution d'organisation.
  Tu ajoutes du réseau, du partage de deps et de la gouvernance
  pour un problème que Rspack + des modules réglaient.
```
::
::good
```text
« Huit équipes autonomes se bloquent sur une release commune,
  et cette contention coûte plus cher que le tax micro-frontend. »
→ problème d'organisation, mesuré, traité au bon niveau.
```
::
:::

L'idée centrale : tu veux presque toujours des **frontières de code** (modules, paquets, propriété), rarement des **frontières de déploiement** (micro-frontends). Confondre les deux est l'erreur la plus chère du domaine.

## La grille de décision

Avant d'écrire une ligne de config Module Federation, réponds honnêtement à ces questions. Il faut un **oui franc à la majorité**, pas un « ce serait bien ».

:::callout{type="info"}
- **Combien d'équipes ?** Moins de trois équipes réellement indépendantes → non. Le découplage n'a personne à découpler.
- **La contention de release est-elle mesurée ?** Peux-tu chiffrer le temps perdu à attendre la build des autres ? Si c'est un ressenti et pas un chiffre, ce n'est pas encore un problème.
- **L'indépendance est-elle réelle ?** Si les équipes partagent quand même React, le design system et l'auth, l'indépendance est une illusion — tu paies le coût sans le bénéfice.
- **Peux-tu écrire le contrat d'intégration ?** Version de React, tokens partagés, propriété des error boundaries, qui rollback : quatre lignes. Si l'organisation ne s'accorde pas dessus, elle n'est pas prête — elle a besoin d'un monorepo et d'une CI plus stricte.
- **As-tu l'ops pour ça ?** Monitoring de la disponibilité des remotes, gestion des versions, budgets de perf par app : c'est une charge permanente, pas un projet.
:::

La conclusion senior, sans détour : les micro-frontends sont un outil de **passage à l'échelle organisationnelle**, avec une taxe technique réelle et mesurable. Ils sont **rarement** justifiés, et **jamais par défaut**. Le jour où ils le sont vraiment, tu le sauras — parce que la douleur d'organisation sera devenue plus grande que la douleur d'ingénierie que tu t'apprêtes à acheter.

## À retenir

:::cheatsheet
- title: "Problème d'organisation, pas de technique"
  desc: "Ils règlent le déploiement indépendant entre équipes. Une seule équipe → inutile."
- title: "Loi de Conway"
  desc: "L'architecture copie la structure des équipes. Découpe le déploiement là où les équipes sont vraiment autonomes."
- title: "Build-time < web components < Module Federation < iframe"
  desc: "Ne monte d'un cran de complexité que si l'organisation l'exige."
- title: "Module Federation 2.0"
  desc: "host/remote, exposes/remotes, shared singleton. Gère webpack, Rspack et Vite en 2026."
- title: "singleton = contrat fragile"
  desc: "Une seule instance de React partout, garantie au runtime, sans filet du compilateur."
- title: "La facture est permanente"
  desc: "Versions partagées, duplication de bundle, design system, routing, débogage distribué, gouvernance."
- title: "Frontières de code, pas de déploiement"
  desc: "Monorepo + modules ou SPA bien découpée règlent 90 % des cas pour 10 % du coût."
- title: "Rarement, jamais par défaut"
  desc: "Oui franc à la grille de décision, ou rien."
:::
