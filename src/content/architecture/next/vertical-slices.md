---
title: "Slices verticales : la feature est l'unité"
slug: "vertical-slices"
framework: "architecture"
level: "next"
order: 1
duration: 14
prerequisites: ["ddd", "hexagonal-clean"]
updated: 2026-06-01
seoTitle: "Vertical slices frontend — la feature comme unité, contre la stratification horizontale"
seoDescription: "Les slices verticales : organiser le code par feature (de l'UI au domaine en passant par la data), pas par couche horizontale. Ce qui change concrètement en frontend, et pourquoi c'est l'évolution des architectures hexagonales pour les apps qui grossissent."
ogVariant: "iris"
related:
  - { framework: "architecture", slug: "hexagonal-clean" }
  - { framework: "architecture", slug: "ddd" }
---

L'architecture **vertical slice** (« slices verticales ») est le pattern qui monte en 2026 contre la stratification horizontale traditionnelle. L'idée : **organiser le code par feature**, pas par couche. Un dossier `checkout/` contient son UI, son domaine, ses adapters HTTP, ses tests — tout. On peut ouvrir, modifier, supprimer une feature sans naviguer dans 5 dossiers transverses.

C'est l'évolution naturelle de l'**hexagonal** : on garde la séparation conceptuelle (UI / use case / domain / adapter), mais on l'**enroule** par feature au lieu de la maintenir au niveau projet.

## Horizontal vs vertical, l'image qui frappe

```text
HORIZONTAL (par couche)              VERTICAL (par slice)

src/                                  src/features/
├── components/                       ├── checkout/
│   ├── CheckoutForm.vue              │   ├── checkout.view.vue
│   ├── ProductCard.vue               │   ├── checkout.use-case.ts
│   └── UserBadge.vue                 │   ├── checkout.domain.ts
├── services/                         │   ├── checkout.repo.http.ts
│   ├── checkout.service.ts           │   └── checkout.test.ts
│   ├── product.service.ts            ├── catalog/
│   └── user.service.ts               │   ├── catalog.view.vue
├── stores/                           │   ├── catalog.use-case.ts
│   ├── checkout.store.ts             │   ├── catalog.domain.ts
│   ├── product.store.ts              │   └── catalog.repo.http.ts
│   └── user.store.ts                 └── account/
└── types/                                ├── account.view.vue
    ├── checkout.ts                       └── ...
    ├── product.ts
    └── user.ts
```

À gauche, pour modifier le checkout : tu navigues dans 4 dossiers. À droite : tu ouvres `features/checkout/`, **tout est là**.

## Ce que ça change en frontend

:::cheatsheet
- title: "Suppression atomique"
  desc: "Retirer une feature = supprimer un dossier. Pas de chasse aux résidus dans 6 endroits."
- title: "Onboarding par feature"
  desc: "Un dev qui rejoint l'équipe checkout lit features/checkout/ et comprend tout en quelques heures. Pas besoin de la map mentale globale."
- title: "Owner clair"
  desc: "Le dossier checkout/ a un owner. Pas de zone grise sur 'à qui appartient checkout.service.ts'."
- title: "PR plus petite"
  desc: "Modifier une feature touche un seul dossier. Code review focalisée. Conflits Git rares."
- title: "Cohabitation de styles"
  desc: "Une feature legacy peut rester en Options API tandis qu'une nouvelle utilise Composition + Vapor. Pas de blocage global."
- title: "Suit FDD naturellement"
  desc: "Si tu livres en features (FDD), tu organises ton code en features. La symétrie est gratuite."
:::

## Avec un cœur partagé : `core/` et `packages/domain`

Le piège est de pousser tout dans les slices. Certaines choses sont **vraiment transverses** : design system, types métier de base (Money, IDs), client HTTP générique, auth. Elles vivent dans `core/` (ou dans `packages/` d'un monorepo) :

```text
src/
├── core/
│   ├── http.ts            # client HTTP générique
│   ├── auth/              # session, token, garde route
│   └── ui/                # design system
└── features/
    ├── checkout/
    │   ├── checkout.view.vue   # importe core/ui + core/http
    │   ├── checkout.use-case.ts
    │   └── checkout.domain.ts
    ├── catalog/
    └── account/
```

**La règle** : les slices peuvent importer de `core/`, mais **pas l'une de l'autre**. Si `checkout` a besoin d'un truc de `catalog`, soit c'est dans `core/`, soit ça passe par une API publique explicite (le slice expose un `index.ts` qui définit ce qui sort).

## Un slice typique, complet

```text
features/checkout/
├── checkout.view.vue              # composant principal
├── checkout.use-case.ts           # orchestration (application layer)
├── checkout.domain.ts             # types + invariants (Cart, LineItem)
├── checkout.repo.http.ts          # adapter HTTP (port défini dans domain)
├── checkout.store.ts              # state réactif (Pinia/store local)
├── checkout.test.ts               # tests unitaires + integration
└── index.ts                       # API publique du slice
```

```ts
// features/checkout/index.ts — ce que le reste de l'app peut importer
export { CheckoutView } from './checkout.view.vue';
export type { Cart } from './checkout.domain';
// le reste reste interne au slice
```

Ailleurs dans l'app, on importe **uniquement via l'index** :

```ts
// app/routes.ts
import { CheckoutView } from '@/features/checkout';   // ✓
import { httpCheckoutRepo } from '@/features/checkout/checkout.repo.http';   // ✗
```

C'est l'**encapsulation au niveau du dossier**. Boundaries ESLint peuvent forcer la règle (cf. [monorepo](/architecture/medior/monorepo) avec Nx).

## La plus-value frontend (l'angle qui compte)

L'argument central pour le frontend : **les features survivent ; les couches changent**. Le design system se refait tous les 2-3 ans. Le client HTTP évolue (REST → tRPC → GraphQL). Le store passe de Vuex à Pinia. Mais la feature *checkout* reste **checkout** : elle continue de prendre un panier, valider, créer une commande.

En organisant **par slice**, tu rends la **feature** stable. Tu peux refondre l'UI globalement (refonte design system) sans toucher la logique de checkout. Tu peux changer de framework (migration Vue 3 → 4, ou React → Solid) **slice par slice**.

L'horizontal est l'inverse : un refactor du `services/` touche **toutes les features simultanément**. La PR est énorme, le risque est partagé.

## Avec DDD : les slices sont des bounded contexts

Si tu as lu [DDD côté frontend](/architecture/senior/ddd), tu reconnais la formule : un slice **est** un bounded context. Même vocabulaire à l'intérieur, traduction explicite à la frontière.

```ts
// features/checkout/checkout.domain.ts
export type Cart = { /* ... */ };
export type Order = { /* ... */ };

// features/account/account.domain.ts
export type Customer = { /* ... */ };    // ≠ Cart.customerId qui est un opaque

// si checkout a besoin de connaître le Customer :
import type { Customer } from '@/features/account';   // via l'index public
```

Pas de partage de types internes, juste l'API publique.

## Combinaison avec hexagonal

Hexagonal et vertical slices ne s'opposent pas : ils s'**emboîtent**. Chaque slice **interne** suit hexagonal (domain / use case / adapters), et l'organisation **globale** est verticale. Tu obtiens le meilleur des deux :

- Au niveau projet : code navigable par feature (vertical)
- Au sein d'une feature : cœur indépendant des adapters (hexagonal)

C'est ainsi que les apps qui durent sont structurées en 2026.

## Quand c'est trop, quand c'est juste

:::callout{type="info"}
**Trop pour un projet à 3 vues.** Si ton app fait une *seule chose*, n'invente pas 7 slices. Garde-le simple, 3 couches horizontales suffisent.

**Juste quand tu vois la tension.** Le signe que les slices verticales paient : tu commences à hésiter quand tu poses un fichier. *« Ça va dans services/ ou dans stores/ ? »* — quand cette question se pose trop souvent, tu sais que tu réorganises par sujet (la feature) au lieu de par type technique.
:::

## Anti-patterns

:::callout{type="warn"}
- **Imports croisés entre slices** — `features/checkout` qui importe `features/catalog/internal/...`. Tue toute l'encapsulation. Force l'API publique via `index.ts`.
- **`core/` qui devient un fourre-tout** — tout est « transverse » dans la tête de quelqu'un. Discute : si une chose appartient vraiment à une feature, mets-la dans le slice.
- **Slice géant** — `features/admin/` avec 47 fichiers. Découpe-le (`features/admin-users/`, `features/admin-settings/`).
- **Tests à part dans `tests/features/checkout/`** — colocalise. Le test vit dans le slice qu'il teste.
- **Forcer la verticale sur une app existante du jour 1** — migre par feature. Pour chaque PR sur une feature donnée, déplace les fichiers concernés vers le slice. La dette horizontale baisse à chaque livraison.
:::

## À retenir

:::cheatsheet
- title: "Organiser par feature, pas par type"
  desc: "features/checkout/ contient tout ce qui concerne checkout. Pas de chasse cross-folders."
- title: "Slice = bounded context"
  desc: "Vocabulaire interne, API publique via index.ts. Pas d'imports croisés internes."
- title: "Cœur partagé minimal"
  desc: "core/ ou packages/ pour le strictement transverse (design system, HTTP générique, types de base)."
- title: "Hexagonal s'emboîte"
  desc: "Vertical au niveau projet, hexagonal au sein du slice. Combinaison naturelle."
- title: "Suppression atomique"
  desc: "Retirer une feature = supprimer le dossier. C'est le test."
- title: "Migrer progressivement"
  desc: "Sur une app existante, déplace par feature à chaque PR. Pas de big bang."
:::
