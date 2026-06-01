---
title: "DDD côté frontend : bounded contexts et langage ubiquitaire"
slug: "ddd"
framework: "architecture"
level: "senior"
order: 1
duration: 18
prerequisites: ["foundations", "monorepo"]
updated: 2026-06-01
seoTitle: "DDD frontend — bounded contexts, agrégats, langage ubiquitaire en pratique"
seoDescription: "Le Domain-Driven Design appliqué au frontend : bounded contexts = feature modules, agrégats côté UI, langage ubiquitaire partagé avec le back. Quand ça paie, où ça dérape, et l'angle frontend qui change tout."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "hexagonal-clean" }
  - { framework: "architecture", slug: "foundations" }
---

Le **Domain-Driven Design** est souvent présenté comme un truc de backend. C'est faux. Le frontend a un domaine, des règles métier, des invariants — donc il a tout à gagner à utiliser le **vocabulaire** et les **séparations** que DDD propose. Cet article extrait les trois idées DDD qui paient vraiment en frontend : **bounded contexts**, **langage ubiquitaire**, **agrégats**. On ignore le reste (event storming, sagas, CQRS lourd) qui se discute mieux côté back.

## L'idée centrale : un domaine n'est pas un schéma

DDD distingue **le modèle du monde** (ce que ton équipe comprend du problème) du **schéma technique** (les tables SQL, les colonnes, les routes API). Côté frontend, c'est encore plus vrai : tu vois directement comment les **personnes** interagissent avec le système, et ton vocabulaire doit refléter **leur** réalité, pas la base de données.

:::compare
::bad
```ts
// vocabulaire qui sent la table
type UserRow = {
  user_id: number;
  is_premium_flag: boolean;
  created_at: string;
  subscription_id: number | null;
};
```
::
::good
```ts
// vocabulaire du métier
type Subscriber = {
  id: SubscriberId;
  plan: 'free' | 'premium';
  joinedAt: Date;
  activeSubscription?: Subscription;
};
```
::
:::

**Pourquoi.** Quand le commercial dit *« on convertit un free en premium »*, le code doit dire `subscriber.upgradeTo('premium')`, pas `db.users.update({ is_premium_flag: true })`. C'est le **langage ubiquitaire** : un seul vocabulaire, partagé entre métier, back et front.

## Bounded contexts : un par feature

Le **bounded context** est la frontière à l'intérieur de laquelle un terme a un sens précis. Le mot *« utilisateur »* veut dire des choses **différentes** selon le contexte :

- Dans **catalog** : un utilisateur = une session, anonyme ou pas, qui consulte
- Dans **billing** : un utilisateur = un payeur avec un mode de paiement valide
- Dans **support** : un utilisateur = un ticket avec un historique

Au lieu d'avoir un `type User` géant qui essaie de tout couvrir, tu as **trois types** dans **trois contexts** :

```text
features/
├── catalog/
│   └── domain/visitor.ts        type Visitor = { id?: string; cart: Cart };
├── billing/
│   └── domain/customer.ts       type Customer = { id: CustomerId; paymentMethod: PaymentMethod };
└── support/
    └── domain/contact.ts        type Contact = { id: ContactId; tickets: Ticket[] };
```

Chaque context a son propre **modèle**, ses propres **règles**, ses propres **adapteurs API**. Quand `Visitor` se logue et achète, il y a une **traduction explicite** vers `Customer` à la frontière (mapper).

**Pourquoi côté frontend ?** Parce que tes apps ont la même tentation backend : un store `user` global qui finit avec 30 champs dont la moitié n'a de sens qu'à un endroit. Bounded contexts = un store par feature, chacun avec **son** type, **son** vocabulaire.

## Agrégats : l'unité d'invariance

Un **agrégat** est un groupe de données qui doit rester **cohérent ensemble**. Côté UI, l'agrégat le plus parlant : le **panier**.

```ts
// domain/cart.ts
export class Cart {
  private constructor(public readonly items: readonly LineItem[]) {}

  static empty(): Cart { return new Cart([]); }

  add(item: LineItem): Cart {
    // Invariant : pas de doublons sur le même produit, on incrémente la qty
    const existing = this.items.find(i => i.productId === item.productId);
    const items = existing
      ? this.items.map(i => i === existing ? i.withQty(i.qty + item.qty) : i)
      : [...this.items, item];
    return new Cart(items);
  }

  total(): Money {
    return this.items.reduce((sum, i) => sum.plus(i.subtotal()), Money.zero());
  }
}
```

Trois choses à noter :
1. **Immutable** — `add` retourne un nouveau `Cart`. Pas de mutation surprise, parfait pour les signals/refs réactifs.
2. **Invariants dans la méthode** — on ne peut pas créer un panier avec deux lignes du même produit. La règle est portée par le type, pas par l'UI.
3. **Pas d'I/O** — `Cart` ne sait pas qu'il existe une API. Il calcule sur des données.

L'UI **demande** au domaine (`cart.add(item)`), elle **n'implémente** pas la règle.

## Le langage ubiquitaire : partagé avec le back

Si le back parle `Subscriber` et le front parle `User`, tu as **deux modèles**, et toute évolution coûte double : traduction de chaque côté, drift garanti.

Dans un **monorepo** (voir le [module dédié](/architecture/medior/monorepo)), tu peux faire mieux :

```text
packages/
├── domain/                 ← types + invariants, neutre (pas de framework)
│   ├── subscriber.ts
│   ├── subscription.ts
│   └── money.ts
├── api-contract/           ← Zod schemas générés depuis OpenAPI
└── api-client/             ← fonctions typées qui parlent au back
```

Le back et le front consomment **le même `@my/domain`**. Quand `Subscription` gagne un champ, c'est typé partout simultanément. **Refactor atomique**.

## La plus-value frontend (l'angle qui change tout)

:::cheatsheet
- title: "Vocabulaire commun produit/back/front"
  desc: "Les noms dans le code sont ceux des stand-ups. Pas de traduction mentale entre conversations et fichiers."
- title: "Stores par feature, pas mégastore"
  desc: "Chaque bounded context a son store. Le store user ne contient pas le panier ni les tickets."
- title: "Refactor par contexte"
  desc: "Tu peux réécrire le contexte billing sans toucher catalog. Les frontières sont des isolants."
- title: "Tests métier rapides"
  desc: "Cart.add(item) se teste en Vitest pur. Pas besoin de monter une vue."
- title: "Onboarding"
  desc: "Un nouveau dev lit features/billing/domain/ et comprend les règles billing en 30 min."
- title: "Évolutions API atomiques"
  desc: "Avec un package domain partagé, le contrat évolue dans une seule PR cross-stack."
:::

## Ce qu'on garde, ce qu'on laisse

DDD a beaucoup de concepts. Pour le frontend, **garde** :
- Bounded contexts (= feature modules avec leur vocabulaire)
- Agrégats (= types immutables avec invariants)
- Langage ubiquitaire (= mêmes noms partout)
- Domain services pour la logique qui ne tient pas dans un agrégat

**Laisse** (ou délègue au back) :
- Event sourcing
- CQRS (séparation commands/queries de bout en bout)
- Sagas complexes
- Repositories pattern strict

Ces choses ne sont pas mauvaises, elles sont juste **lourdes** au regard de ce que coûte un changement côté UI.

## Anti-patterns

:::callout{type="warn"}
- **Un store qui contient tous les contexts** — `user`, `cart`, `tickets`, `theme` dans le même store. Tu perds le bénéfice des frontières.
- **Réutiliser un type cross-context** — un `type User` partagé entre catalog, billing et support finit en *« God object »*. Chaque context a son type, même si certains champs se ressemblent.
- **Logique métier dans les composants** — le composant orchestre, il ne calcule pas. La règle vit dans le domaine.
- **Mapper « invisible »** — quand un type Visitor devient Customer, écris la traduction **explicitement** (`customerFrom(visitor, paymentMethod)`). Pas de cast ou de spread silencieux.
- **DDD sur une page** — un projet d'une seule feature et trois écrans n'a pas besoin de DDD. Garde-le pour les apps qui ont **plusieurs sujets** métier.
:::

## Par où commencer

1. Identifie 2-3 **bounded contexts** (typiquement : catalog, billing, support, ou similaire)
2. Crée un dossier par context dans `features/`, avec son `domain/` interne
3. Mets le **vocabulaire commun** (Money, IDs typés) dans `packages/domain` partagé
4. Refuse les imports cross-context — un context parle au monde via une **anti-corruption layer** (mapper)
5. Documente le langage ubiquitaire dans un `glossary.md` à la racine — terme + définition

## À retenir

:::cheatsheet
- title: "Bounded contexts = features"
  desc: "Un contexte = un dossier feature avec son vocabulaire, son store, ses adapteurs."
- title: "Agrégats immutables"
  desc: "Une classe ou un type qui porte ses invariants ; mutation = nouvel objet."
- title: "Langage ubiquitaire"
  desc: "Mêmes noms entre stand-up, back et front. Glossaire à la racine du repo."
- title: "Pas de God-User"
  desc: "Visitor, Customer, Contact selon le contexte. Mappers explicites entre."
- title: "Garde l'utile, laisse le lourd"
  desc: "Contexts + agrégats + vocabulaire. Pas d'event sourcing ni de CQRS strict côté front."
- title: "Refactor par contexte"
  desc: "Le bénéfice principal : réécrire billing sans toucher catalog."
:::
