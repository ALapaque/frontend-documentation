---
title: "Fondations : couches, séparation, dépendances"
slug: "foundations"
framework: "architecture"
level: "junior"
order: 1
duration: 12
prerequisites: []
updated: 2026-06-01
seoTitle: "Architecture frontend — couches, séparation des responsabilités, dépendances"
seoDescription: "Les fondations d'une architecture frontend lisible : couches (UI / domaine / data), séparation des responsabilités, sens des dépendances, et pourquoi ça paie même sur une petite app."
ogVariant: "sage"
related:
  - { framework: "architecture", slug: "monorepo" }
  - { framework: "architecture", slug: "hexagonal-clean" }
---

« Architecture » sonne grand pour une appli frontend. C'est pourtant **la chose qui décide si tu vas pouvoir ajouter une feature dans 6 mois sans tout retoucher**. Pas besoin de DDD ni de monorepo pour commencer ; trois idées suffisent : **couches**, **responsabilités**, **sens des dépendances**.

## Les trois couches d'une app frontend

Toute app frontend, même petite, s'organise mentalement en trois couches :

:::cheatsheet
- title: "UI"
  desc: "Composants, templates, styles. Ce que l'utilisateur voit et clique."
- title: "Domaine"
  desc: "Les règles métier : « un panier ne peut pas avoir un total négatif », « un utilisateur a un email valide ». Indépendant du DOM."
- title: "Data"
  desc: "Les adapteurs : HTTP, localStorage, IndexedDB, WebSocket. La porte vers le monde extérieur."
:::

C'est la même découpe partout (mobile, backend, desktop) parce qu'elle correspond à des **vitesses de changement différentes** : la couche UI bouge tout le temps (refonte design, A/B tests), le domaine bouge rarement (les règles métier sont stables), la data bouge quand l'API change.

## Séparation des responsabilités : un fichier, un sujet

Le test : si tu lisais le nom du fichier à voix haute, est-ce que tu peux dire en une phrase **ce qu'il fait** ?

:::compare
::bad
```ts
// utils.ts — fourre-tout : http, date, validation, dom...
export function fetchUser(id: string) { /* ... */ }
export function formatDate(d: Date) { /* ... */ }
export function isEmail(s: string) { /* ... */ }
export function scrollTo(el: HTMLElement) { /* ... */ }
```
::
::good
```ts
// api/user.ts          → un sujet : appeler l'API user
// format/date.ts       → un sujet : formater les dates
// validate/email.ts    → un sujet : valider l'email
// dom/scroll.ts        → un sujet : utilitaires DOM
```
::
:::

**Pourquoi.** Un fichier `utils.ts` finit par contenir 40 fonctions sans rapport — personne n'ose le toucher de peur de casser quelque chose ailleurs. Un fichier par sujet rend le **scope** du changement évident.

## Le sens des dépendances : vers l'intérieur

Le principe le plus important. Dessine tes 3 couches en cercles concentriques :

```text
        ┌─────────────────────────┐
        │  UI (composants, vues)  │   ← dépend de Domaine
        │  ┌──────────────────┐   │
        │  │  Domaine         │   │   ← le cœur, dépend de rien
        │  │  (règles, types) │   │
        │  └──────────────────┘   │
        │  Data (HTTP, storage)   │   ← dépend de Domaine
        └─────────────────────────┘
```

**Règle d'or** : les dépendances pointent **vers le cœur**. L'UI importe du domaine, la data importe du domaine, mais le **domaine n'importe rien d'externe**.

```ts
// ✓ ui/cart-view.ts importe domain/cart
import { totalOf } from '@/domain/cart';

// ✗ domain/cart.ts importe ui/cart-view
import { CartView } from '@/ui/cart-view';   // INTERDIT
```

**Pourquoi.** Si le domaine ne dépend ni de l'UI ni de la data, tu peux :
- **Le tester sans navigateur** (Vitest pur, instantané)
- **Changer le framework** sans réécrire les règles métier
- **Swapper l'API** REST → tRPC → GraphQL sans toucher au cœur

## La plus-value sur un projet frontend

C'est ici que ça paie, pas en théorie :

1. **Refactor sans peur.** Quand tu changes la couleur d'un bouton, tu modifies l'UI. Tu sais que ça n'affecte ni le domaine ni la data. Tu peux relire `git diff` en 30 secondes au lieu de 30 minutes.

2. **Tests rapides au bon endroit.** Les tests de domaine tournent en millisecondes (logique pure). Les tests d'UI ne valident que ce qui est UI. Personne ne reteste les règles du panier dans 12 fichiers de composants.

3. **Onboarding.** Un nouveau dev ouvre `src/domain/` et lit les règles métier en une demi-journée. Il n'a pas à reconstituer la logique depuis 40 composants éparpillés.

4. **Refonte de l'UI sans refonte du back.** Tu refais le design system ? Le domaine ne bouge pas. Tu changes de framework ? Le domaine non plus. Les coûts sont **bornés**.

:::callout{type="warn"}
**Le piège du tout-component.** Beaucoup d'apps frontend mélangent les trois couches dans le composant : il fetch, il calcule, il affiche. Ça marche à l'échelle de la fiche d'un side-project. Au-delà, c'est ingérable : tu ne peux pas tester la règle sans monter une vue, tu ne peux pas changer l'API sans réécrire 30 composants. La séparation, c'est bon marché si tu le fais dès le départ.
:::

## Concrètement, par où commencer

Sur une app neuve :
1. Crée trois dossiers : `domain/`, `data/`, `ui/` (ou `features/X/{domain,data,ui}` si tu pars en feature-folder)
2. Mets tes types métier dans `domain/`, sans rien importer
3. Les appels HTTP vont dans `data/`, ils retournent des types du domaine
4. Les composants vivent dans `ui/`, ils consomment domaine + data

Sur une app existante : tu n'as pas besoin de tout refaire. **À chaque touche**, demande-toi *« est-ce que cette chose est UI, domaine ou data ? »* et range-la côté propre. La dette baisse à chaque PR.

## À retenir

:::cheatsheet
- title: "Trois couches"
  desc: "UI (vue), domaine (règles), data (adapteurs). Vitesses de changement différentes."
- title: "Un fichier, un sujet"
  desc: "Si tu n'arrives pas à le résumer en une phrase, découpe."
- title: "Dépendances vers l'intérieur"
  desc: "UI et data dépendent du domaine. Le domaine ne dépend de rien."
- title: "Tests au bon endroit"
  desc: "Domaine = unit pur (millisecondes). UI = ce que l'utilisateur voit."
- title: "Refonte bornée"
  desc: "Changer l'UI ne touche pas le domaine. Et vice-versa."
:::
