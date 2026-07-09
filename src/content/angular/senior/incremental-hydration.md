---
title: "Hydratation incrémentale : @defer + hydrate"
slug: "incremental-hydration"
framework: "angular"
level: "senior"
order: 11
duration: 16
prerequisites: ["ssr-hydration", "defer-lazy"]
updated: 2026-07-08
seoTitle: "Hydratation incrémentale Angular — hydrate on viewport/interaction, event replay"
seoDescription: "Par défaut depuis Angular 22 : l'hydratation incrémentale hydrate chaque sous-arbre @defer à la demande (viewport, interaction, hover, idle, never) avec event replay. Comment ça marche, les triggers, et les pièges à éviter."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "angular", slug: "defer-lazy" }
---

Avec l'hydratation complète, le serveur envoie une page déjà rendue… mais le navigateur télécharge et exécute quand même le JavaScript de **toute** la page avant qu'elle ne devienne interactive. L'hydratation incrémentale casse cette facture unique : chaque sous-arbre `@defer` reste du HTML inerte jusqu'à ce qu'un trigger `hydrate` décide de le réveiller — au scroll, au clic, ou jamais.

Stable depuis Angular 20, elle est **par défaut en v22** pour les nouveaux projets SSR. Mi-2026, c'est le modèle standard : des îlots hydratés à la demande, avec event replay pour ne perdre aucune interaction.

## Rappel : hydratation, le coût caché

Le HTML SSR est déjà à l'écran : le rendu ne coûte plus rien. Ce que l'utilisateur paie ensuite, c'est le **réveil** : télécharger le JS de chaque composant, le parser, l'exécuter, parcourir le DOM pour attacher les listeners et reconstruire l'état. En hydratation complète, ce travail couvre la page entière — y compris le footer, les commentaires trois écrans plus bas, le widget que personne n'ouvrira. Rien de visible n'en sort ; seul l'INP en souffre pendant que le main thread mouline.

L'idée de l'incrémentale : puisque le HTML est déjà là, ne payer le JS d'un sous-arbre **que si** l'utilisateur s'en approche.

## Le modèle Angular : @defer + hydrate

Un bloc `@defer` accepte, en plus de ses triggers classiques, des triggers `hydrate` qui ne s'appliquent qu'au chargement initial en SSR.

```html
@defer (hydrate on viewport) {
  <app-comments [postId]="id()" />
} @placeholder {
  <div class="skeleton">Commentaires…</div>
}
```

**Pourquoi.** Contrairement au `@defer` côté client, le serveur rend ici le **contenu réel** du bloc, pas le placeholder : l'utilisateur voit les commentaires immédiatement. Le chunk JS, lui, n'est téléchargé et hydraté que lorsque le bloc entre dans le viewport. Le `@placeholder` reste obligatoire : lors d'une navigation côté client (pas de HTML serveur), le bloc redevient un `@defer` normal et ce sont les triggers classiques qui s'appliquent.

Les triggers disponibles :

```html
@defer (hydrate on idle) { ... }             <!-- navigateur inactif (requestIdleCallback) -->
@defer (hydrate on viewport) { ... }         <!-- le contenu entre dans le viewport -->
@defer (hydrate on interaction) { ... }      <!-- clic ou keydown sur le contenu -->
@defer (hydrate on hover) { ... }            <!-- survol ou focusin -->
@defer (hydrate on immediate) { ... }        <!-- dès la fin du rendu initial -->
@defer (hydrate on timer(4s)) { ... }        <!-- après un délai (ms ou s) -->
@defer (hydrate when canEdit()) { ... }      <!-- condition booléenne (signal/expression) -->
@defer (on viewport; hydrate never) { ... }  <!-- HTML statique à vie -->
```

Deux différences avec les triggers classiques : pas de référence d'élément (`hydrate on viewport(ref)` n'existe pas — la cible est le contenu déjà rendu du bloc), et l'hydratation est **descendante** : déclencher un bloc imbriqué hydrate d'abord ses parents.

:::callout{type="warn"}
`hydrate never` gèle tout le sous-arbre : aucun trigger `hydrate` imbriqué en dessous ne se déclenchera. Réserve-le au contenu réellement statique — le bloc ne réagira plus jamais côté client sur cette page.
:::

## Event replay : le clic d'avant

Entre l'affichage du HTML et l'hydratation d'un îlot, l'utilisateur peut cliquer sur un bouton dont le listener n'existe pas encore. Angular pose un écouteur global à la racine, capture ces événements, puis les **rejoue** sur les vrais listeners une fois le bloc hydraté.

```ts
provideClientHydration(withEventReplay());
```

**Pourquoi.** Avec `hydrate on interaction`, le clic joue les deux rôles : il déclenche le chargement du chunk **et** il est rejoué après l'hydratation. L'utilisateur clique sur « Répondre », le composant se réveille, le handler reçoit le clic — aucune interaction perdue, aucun bouton mort. C'est ce qui rend les triggers paresseux acceptables en production : le pire cas n'est plus un clic dans le vide, juste une latence.

Avec l'hydratation incrémentale, l'event replay est inclus automatiquement : pas besoin d'ajouter `withEventReplay()` à la main.

## Setup

```ts
// app.config.ts
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration(withIncrementalHydration())],
});
```

Deux conditions : le SSR doit être actif (`provideServerRendering()` côté serveur), et les blocs concernés doivent porter un trigger `hydrate`. Depuis la v22, les nouveaux projets générés avec `--ssr` embarquent cette configuration d'office — sur un projet plus ancien, l'ajout ci-dessus suffit, sans toucher aux templates existants.

## Choisir ses triggers

La stratégie se décide zone par zone : `viewport` pour tout le below-the-fold, `interaction` pour les widgets coûteux qui attendent un geste (éditeur, chat, panneau de filtres), `hover` pour les menus, `idle` ou `timer` pour le secondaire non urgent, `never` pour le statique pur (footer, mentions légales).

:::compare
::bad
```html
<!-- « incrémental » de façade : tout s'hydrate au chargement -->
@defer (hydrate on immediate) { <app-hero /> }
@defer (hydrate on immediate) { <app-comments /> }
@defer (hydrate on immediate) { <app-footer /> }
```
::
::good
```html
<app-hero />                                          <!-- above-the-fold : eager -->
@defer (hydrate on viewport) { <app-comments /> }
@defer (hydrate on interaction) { <app-share-menu /> }
@defer (on viewport; hydrate never) { <app-footer /> }
```
::
:::

**Pourquoi.** `hydrate on immediate` partout, c'est de la full hydration déguisée : même JS téléchargé, même travail sur le main thread, juste réordonné. Le gain vient des blocs qui ne s'hydratent **jamais** pendant la session (viewport non atteint, widget jamais ouvert, `never`) ou qui s'hydratent hors du chemin critique. Chaque trigger doit répondre à « quand ce sous-arbre a-t-il réellement besoin de JS ? ».

## Pièges

- **DOM dépendant d'un état client.** Tant qu'un bloc n'est pas hydraté, son HTML doit rester identique à la sortie serveur. Du contenu conditionné par `localStorage`, la taille d'écran ou un store client provoque un mismatch (`NG0500`) au réveil du bloc. Passe par `afterNextRender` ou garde cet état hors du rendu initial.
- **Ne défère pas l'élément LCP.** Le héros above-the-fold doit rester eager : un trigger `hydrate` n'apporte rien (il est déjà visible, donc hydraté aussitôt) et, en navigation client, son rendu passerait derrière un chargement de chunk.
- **Mesure avant de conclure.** Compare LCP et INP avant/après sur un vrai réseau (throttling 4G). Si tout le contenu est above-the-fold, l'incrémentale ne changera presque rien — le levier, c'est la part de page qui échappe à l'hydratation.
- **`hydrate when` n'est évalué qu'au chargement initial.** Comme tout trigger `hydrate`, il ne concerne que la première visite SSR ; ensuite, ce sont les triggers classiques du bloc qui pilotent.

## À retenir

L'hydratation incrémentale transforme chaque `@defer` en îlot : le HTML serveur s'affiche tout de suite, le JS n'arrive que quand le trigger `hydrate` le décide, et l'event replay garantit qu'aucun clic intermédiaire n'est perdu. Stable depuis la v20, par défaut en v22 : la vraie décision senior n'est plus « l'activer ou pas », mais choisir le bon trigger par zone — et laisser `hydrate never` faire le ménage sur le statique.

:::cheatsheet
- title: "hydrate on idle / viewport / interaction / hover / immediate / timer(t)"
  desc: "Triggers d'hydratation du chargement initial SSR ; pas de référence d'élément, la cible est le contenu rendu."
- title: "hydrate when <condition>"
  desc: "Hydrate quand l'expression devient vraie — évaluée au chargement initial seulement."
- title: "hydrate never"
  desc: "Sous-arbre jamais hydraté, triggers imbriqués inclus. Pour le statique pur."
- title: "provideClientHydration(withIncrementalHydration())"
  desc: "Active la fonctionnalité (SSR requis) et inclut l'event replay. Défaut des nouveaux projets SSR en v22."
- title: "Event replay"
  desc: "Les événements émis avant l'hydratation sont capturés puis rejoués — aucun clic perdu."
- title: "Stratégie"
  desc: "Eager pour le LCP, viewport pour le below-the-fold, interaction pour les widgets coûteux, never pour le statique."
:::
