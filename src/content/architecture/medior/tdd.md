---
title: "TDD démystifié : red/green/refactor en frontend"
slug: "tdd"
framework: "architecture"
level: "medior"
order: 2
duration: 15
prerequisites: ["foundations"]
updated: 2026-06-01
seoTitle: "TDD frontend — red/green/refactor, où ça paie, où c'est faux"
seoDescription: "Le TDD côté frontend, sans dogmatisme : cycle red-green-refactor, quand il fait gagner du temps (logique métier, helpers, hooks), quand c'est contre-productif (UI exploratoire), et comment l'introduire dans une équipe sans religion."
ogVariant: "gold"
related:
  - { framework: "architecture", slug: "foundations" }
  - { framework: "architecture", slug: "fdd-vs-tdd-vs-bdd" }
---

Le TDD (*Test-Driven Development*) souffre d'un problème de réputation : soit on en parle comme d'une religion qu'il faut appliquer partout, soit on le dénigre comme une perte de temps. La vérité est ailleurs. Le TDD est un **outil de design** qui paie sur certains types de code et pas sur d'autres. Voici où il marche **en frontend**, et où il devient contre-productif.

## Le cycle, en 30 secondes

```text
1. RED      écris un test qui échoue (la feature n'existe pas encore)
2. GREEN    écris le code le plus simple qui le fait passer
3. REFACTOR nettoie, sans casser le test
```

Trois étapes, **dans cet ordre**. La règle implicite : tu n'écris pas de code de prod sans qu'un test échoue. Tu n'écris pas de test qui passe déjà.

## Un exemple, court

Tu dois ajouter une remise progressive sur le panier.

```ts
// 1. RED — pas encore d'implémentation
import { describe, expect, it } from 'vitest';
import { applyDiscount } from './cart';

it('5% off au-dessus de 50€', () => {
  expect(applyDiscount({ total: 60 })).toEqual({ total: 57 });
});
// ❌ applyDiscount is not defined
```

```ts
// 2. GREEN — la chose la plus simple
export function applyDiscount(cart: { total: number }) {
  return { total: cart.total * 0.95 };
}
// ✅ passe — mais ne gère pas le seuil
```

```ts
// 1. RED encore — un second cas
it('pas de remise sous 50€', () => {
  expect(applyDiscount({ total: 40 })).toEqual({ total: 40 });
});
// ❌ retourne 38 (40 * 0.95)
```

```ts
// 2. GREEN
export function applyDiscount(cart: { total: number }) {
  return { total: cart.total >= 50 ? cart.total * 0.95 : cart.total };
}
// ✅
```

```ts
// 3. REFACTOR
const DISCOUNT_THRESHOLD = 50;
const DISCOUNT_RATE = 0.05;
export function applyDiscount(cart: { total: number }) {
  const discounted = cart.total * (1 - DISCOUNT_RATE);
  return { total: cart.total >= DISCOUNT_THRESHOLD ? discounted : cart.total };
}
```

Chaque cycle te donne **un test + un peu de code**. Tu ne sur-implémentes pas (YAGNI), tu ne sous-teste pas (chaque cas a un test).

## Où ça paie en frontend

:::cheatsheet
- title: "Logique métier pure"
  desc: "Helpers, calculs, formatters, validators. C'est ici que le TDD brille — feedback instantané, design itératif."
- title: "Hooks / composables custom"
  desc: "useDebounced, useCart : un comportement clair, des cas d'erreur à couvrir. TDD aide à dessiner l'API."
- title: "Reducers / stores"
  desc: "Une fonction (state, action) → state. Parfait pour TDD : déterministe, sans I/O."
- title: "Parsers, sérialiseurs"
  desc: "URL params, formats de date custom, normalisation API. Tests de cas concrets en premier."
:::

**Le pattern commun** : du code **déterministe**, **sans DOM**, où l'**API** publique est simple. Le test pousse à un design minimal — tu ne codes que ce qui est testé.

## Où ça ne paie pas (et ce n'est pas grave)

:::callout{type="warn"}
- **Composant exploratoire** — un nouveau dashboard où tu cherches encore la disposition. Tu vas changer le DOM 12 fois ; le TDD te force à réécrire 12 fois les tests. Code d'abord, test après stabilisation.
- **Animations et effets visuels** — Lottie, GSAP, Three.js. Le test pertinent est *visuel*, pas unitaire. Storybook ou capture de référence, pas TDD.
- **Intégrations externes en exploration** — tu découvres une nouvelle API tierce, tu ne sais pas encore quelle forme prend la réponse. Code, observe, **puis** verrouille en test.
- **CSS et layout** — pas de TDD pour les pixels. Inspection visuelle + Playwright screenshot pour les régressions.
:::

## La plus-value côté frontend (au-delà du test)

C'est le point souvent manqué. Le TDD n'est **pas** d'abord pour la couverture — c'est pour le **design**.

1. **Force des API petites.** Quand tu dois écrire le test *avant*, tu te demandes naturellement « quelle est l'API la plus simple ? » Tu écris `applyDiscount(cart)`, pas `new DiscountService().apply(cart, config)`.

2. **Sépare l'invariant du framework.** Écrire un test sans monter une vue te force à isoler la logique du composant. Tu refactorises automatiquement vers la couche [domain](/architecture/junior/foundations) que tu veux découpler.

3. **Documente l'intention.** Le test dit `'5% off au-dessus de 50€'`. Pas besoin de commentaire. Quand le seuil bouge, le test bouge, et l'historique git montre l'intention.

4. **Refactor sans peur.** Tu refactores le code de remise (ajoute du dégressif, change la structure). Les tests existants couvrent les anciens cas — tu sais si tu casses.

## La méthode pragmatique : *test-first* quand ça aide

Pas besoin de TDD à 100 %. La règle utile dans une équipe :

> **Tout helper, hook, reducer, store : test d'abord. Composant : code d'abord, test après stabilisation.**

C'est un compromis qui marche en pratique. La logique métier est testée tôt (là où ça paie le plus). L'UI est testée *quand la forme est trouvée* (là où le TDD coûte cher).

## Anti-patterns

:::callout{type="warn"}
- **Tester l'implémentation** — `expect(component.state.count).toBe(1)`. Tu testes ce que l'utilisateur fait (`expect(screen.getByText('1'))`), pas comment c'est stocké.
- **Tests qui passent toujours** — `expect(true).toBe(true)` déguisé. Vérifie que ton test échoue **avant** de coder.
- **Mocker tout** — un test qui mocke 12 dépendances ne teste plus rien. Refactore le code, pas le test.
- **100 % de couverture en cible** — la couverture n'est pas le but. Couvre **ce qui change** et **ce qui casse silencieusement**.
- **TDD religieux** — refuser de coder sans test partout. Tu finis avec des tests qui contraignent au lieu de guider.
:::

## À retenir

:::cheatsheet
- title: "Red / Green / Refactor"
  desc: "Test qui échoue, code minimal pour passer, nettoyage. Dans cet ordre."
- title: "Test-first sur la logique pure"
  desc: "Helpers, hooks, reducers, parsers. Là où le TDD paie le plus."
- title: "Code-first sur l'UI exploratoire"
  desc: "Animation, layout, intégration nouvelle. Test après stabilisation."
- title: "Le TDD est un outil de design"
  desc: "Le bénéfice principal : API plus simple, couches mieux séparées. Pas la couverture."
- title: "Teste le contrat"
  desc: "Ce que l'utilisateur voit, pas comment c'est stocké."
:::
