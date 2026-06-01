---
title: "FDD vs TDD vs BDD : quand choisir quoi"
slug: "fdd-vs-tdd-vs-bdd"
framework: "architecture"
level: "senior"
order: 3
duration: 14
prerequisites: ["tdd"]
updated: 2026-06-01
seoTitle: "FDD vs TDD vs BDD frontend — quand utiliser quoi en pratique"
seoDescription: "Trois méthodologies, un seul vocabulaire confus : Feature-Driven Development (organisation produit), Test-Driven Development (cycle de code), Behavior-Driven Development (langage métier). Ce qui les distingue, où chacun paie en frontend, et comment les combiner."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "tdd" }
  - { framework: "architecture", slug: "ddd" }
---

Les acronymes en *-DD* (TDD, BDD, FDD, DDD, ATDD…) circulent comme des étiquettes interchangeables. Elles ne le sont pas. **TDD est une pratique de codage**, **BDD est une discipline de communication**, **FDD est une méthode d'organisation produit**. On peut faire les trois ensemble — ou aucun. Cet article démêle ce que chacun apporte vraiment en frontend, et quand y aller.

## Trois disciplines, trois niveaux

:::cheatsheet
- title: "TDD — Test-Driven Development"
  desc: "Niveau code. Cycle red/green/refactor sur des fonctions. Outil de design pour le développeur."
- title: "BDD — Behavior-Driven Development"
  desc: "Niveau équipe. Spécifications en langage naturel partagées entre PM/QA/dev (Gherkin)."
- title: "FDD — Feature-Driven Development"
  desc: "Niveau projet. Découpage du roadmap en features livrables courtes (2 semaines max)."
:::

Ce n'est **pas** un choix exclusif. Tu peux livrer en FDD, spécifier en BDD, coder en TDD. Ou n'utiliser que TDD. Ou aucun.

## TDD : voir l'article dédié

Le cycle red/green/refactor est couvert en détail dans [TDD démystifié](/architecture/medior/tdd). Court rappel pour le contraste :

```ts
// 1. Test qui échoue
it('applique 5% au-dessus de 50€', () => {
  expect(applyDiscount({ total: 60 })).toEqual({ total: 57 });
});
// 2. Code minimal qui passe
// 3. Refactor
```

Le TDD adresse le **comment** : comment construire la fonction. Il vit dans Vitest/Jest, dans l'IDE, dans la PR. C'est une **discipline du codeur**.

## BDD : le langage métier comme test

Le BDD adresse le **quoi** et le **pourquoi**. Il produit des **scénarios** en Gherkin, lisibles par le PM, le QA, le dev :

```gherkin
Feature: Remise progressive sur le panier
  En tant qu'acheteur
  Je veux une remise au-dessus de 50€
  Pour être incité à compléter mon panier

  Scenario: Panier au-dessus du seuil
    Given un panier de 60€
    When l'utilisateur consulte le total
    Then il voit 57€ et un libellé "remise 5%"

  Scenario: Panier sous le seuil
    Given un panier de 40€
    When l'utilisateur consulte le total
    Then il voit 40€ et pas de mention de remise
```

Ces scénarios sont **exécutables** (Cucumber, Playwright + step definitions) : un dev écrit le glue code qui transforme « un panier de 60€ » en setup réel, « il voit 57€ » en assertion DOM. Quand le PM relit la feature, il lit le test.

**La plus-value frontend** :
- **Conversation cadrée** — pas d'ambiguïté entre « le PM voulait X » et « le dev a fait Y »
- **Tests E2E lisibles** — Playwright + Gherkin = scénarios que le QA peut écrire
- **Critères d'acceptation versionnés** — chaque PR cite les scénarios couverts

**Le coût** : le glue code (step definitions) coûte du temps à maintenir. Sur des features instables, c'est de la friction. Le BDD paie sur les **features clés** dont les règles métier sont **stables et discutées** (paiement, abonnement, droits d'accès), pas sur le hover d'un bouton.

## FDD : découper le roadmap en features

Le FDD vient des années 90 (Coad, De Luca). En 2026, il a fusionné avec ce qu'on appelle aujourd'hui *feature-based development* sans le nom : **roadmap en features livrables courtes**, chaque feature ayant son owner, ses critères d'acceptation, sa branche/PR.

Concrètement, FDD-en-pratique côté frontend :

```text
Feature : Paiement par Apple Pay
  ├── Owner : Léa (front)
  ├── Critères d'acceptation : 3 scenarios (cf. fichier BDD)
  ├── Estimation : 2 semaines max
  ├── Branche : feat/applepay
  └── Livrable : déployable en feature flag
```

**La plus-value frontend** :
- **Pas de feature de 3 mois** — si une chose ne se livre pas en 2 semaines, on la découpe
- **Ownership clair** — pas de tickets orphelins
- **Feature flags** par feature — déploiement continu sans casser le main

**Ce que FDD n'apporte pas** : il ne dit rien sur **comment** coder ni sur **quel langage** spécifier. Il complète TDD et BDD, il ne les remplace pas.

## Quand combiner quoi (le tableau de décision)

| Contexte | TDD | BDD | FDD |
|---|---|---|---|
| Helpers, hooks, reducers, parsers | **Oui** | Non | — |
| Composant UI exploratoire | Non | Non | — |
| Paiement, abonnement, droits | **Oui** | **Oui** | **Oui** |
| Animation, layout, design | Non | Non | — |
| Roadmap produit | — | — | **Oui** |
| Conversation PM ↔ dev floue | — | **Oui** | — |
| Couverture de régression critique | **Oui** | **Oui** | — |

**Trois patterns gagnants** :

1. **Solo dev, side project** → TDD sur les fonctions pures, c'est tout. Pas de BDD ni FDD.
2. **Petite équipe (3-5 devs)** → TDD + FDD (livrer en features courtes). BDD sur les flows critiques (paiement, auth) seulement.
3. **Grande équipe (10+ devs) + métier complexe** → les trois. TDD côté code, BDD pour spécifier les flux clés, FDD pour le roadmap. Le DDD ([article dédié](/architecture/senior/ddd)) couvre le vocabulaire commun.

## L'angle frontend spécifique

C'est ici que ça paie vraiment, pour une app frontend en équipe :

:::cheatsheet
- title: "TDD verrouille la logique métier"
  desc: "Les helpers (Money, Cart, Date) sont en TDD. Refactor sans peur, refonte UI sans casser les règles."
- title: "BDD aligne PM ↔ QA ↔ dev"
  desc: "Le scénario d'achat est le même document pour les trois. La même phrase pilote le test E2E."
- title: "FDD rend la roadmap réelle"
  desc: "Chaque feature livre une valeur observable. Pas de PR de 3 mois qui pourrit la branche."
- title: "Feature flags = continuous delivery"
  desc: "Tu mergeras du code dormant. La feature s'active quand le BDD valide les scénarios."
- title: "Le combo TDD + BDD est testable à deux niveaux"
  desc: "TDD côté logique (Vitest, ms). BDD côté E2E (Playwright + Gherkin, min). Couverture sans redondance."
:::

## Anti-patterns

:::callout{type="warn"}
- **BDD sur tout** — écrire des step definitions pour le hover d'un bouton est du gaspillage. Réserve BDD aux flux qui se discutent en réunion.
- **TDD religieux** — refuser de coder sans test. Voir [TDD démystifié](/architecture/medior/tdd) : code-first pour l'UI exploratoire.
- **Gherkin verbeux qui décrit l'implémentation** — *« Given je clique sur le bouton bleu »* n'est pas BDD, c'est un test E2E déguisé. Reformule : *« Given l'utilisateur veut payer »*.
- **FDD sans feature flags** — découper en features sans pouvoir les désactiver = tu redéploies pour rollback. La feature flag est ce qui rend FDD viable.
- **Mélanger les trois sans hiérarchie** — un dossier `tests/` qui mélange unit, BDD et E2E devient ingérable. Sépare `tests/unit/`, `tests/features/` (Gherkin), `tests/e2e/`.
:::

## À retenir

:::cheatsheet
- title: "TDD = pratique du codeur"
  desc: "Red/green/refactor. Pour les fonctions pures, hooks, reducers."
- title: "BDD = pratique de l'équipe"
  desc: "Gherkin partagé PM/QA/dev. Pour les flows métier critiques."
- title: "FDD = pratique du projet"
  desc: "Features courtes, owners, flags. Pour le roadmap qui livre."
- title: "Pas exclusifs"
  desc: "On peut faire TDD seul, ou TDD+BDD+FDD ensemble. Choisis selon l'équipe."
- title: "Réserve BDD aux flux clés"
  desc: "Paiement, auth, droits. Pas le hover d'un bouton."
- title: "FDD a besoin de feature flags"
  desc: "Sans flag, le découpage en features est théorique."
:::
