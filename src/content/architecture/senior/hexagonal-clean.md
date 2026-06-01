---
title: "Hexagonal & Clean : le cœur indépendant des adapteurs"
slug: "hexagonal-clean"
framework: "architecture"
level: "senior"
order: 2
duration: 17
prerequisites: ["foundations", "ddd"]
updated: 2026-06-01
seoTitle: "Hexagonal & Clean Architecture frontend — ports, adapters, swap REST/tRPC sans douleur"
seoDescription: "L'architecture hexagonale (Clean Architecture) appliquée au frontend : un cœur métier qui ignore HTTP, le framework et le DOM ; ports et adapters pour swapper REST → tRPC → cache, tests métier en millisecondes, et le rendre concret sans dogmatisme."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "ddd" }
  - { framework: "architecture", slug: "foundations" }
---

L'architecture **hexagonale** (alias *ports and adapters*, alias *Clean*) tient en une phrase : **le cœur métier ne dépend de rien**. Ni du framework, ni de HTTP, ni du DOM. Tout ce qui est externe est branché par des **ports** (interfaces) et des **adapters** (implémentations). Côté frontend, ce n'est pas une lubie de backend : c'est ce qui te permet de **swapper REST pour tRPC sans réécrire les règles**, et de tester ton métier en millisecondes sans navigateur.

## L'image utile

Représente ton app comme une cible :

```text
        ┌───────────────────────────────────────┐
        │  Adapters externes                    │
        │  ┌─────────────────────────────────┐  │
        │  │  Application (use cases)        │  │
        │  │  ┌───────────────────────────┐  │  │
        │  │  │  Domaine (entités,        │  │  │
        │  │  │  invariants, règles)      │  │  │
        │  │  └───────────────────────────┘  │  │
        │  │  Ports : interfaces sortantes   │  │
        │  └─────────────────────────────────┘  │
        │  HTTP · DOM · Storage · WebSocket     │
        └───────────────────────────────────────┘
```

- **Domaine** (cœur) : types métier, invariants. Aucun import externe.
- **Application** : *use cases* (`AddItemToCart`, `Checkout`). Orchestrent le domaine. Déclarent des **ports**.
- **Adapters** : implémentations concrètes des ports (HTTP, localStorage, framework UI).

**La direction des dépendances** : du dehors vers le dedans. **Jamais l'inverse**.

## Un port, concrètement

Un *use case* a besoin de récupérer un produit. Le domaine ne sait pas que ça passe par HTTP. Il déclare un **port** :

```ts
// domain/ports/product-repo.ts — interface, pas d'implémentation
export interface ProductRepo {
  byId(id: ProductId): Promise<Product>;
  search(query: string): Promise<Product[]>;
}
```

Le *use case* prend ce port en dépendance :

```ts
// application/get-product.ts
import type { ProductRepo } from '@/domain/ports/product-repo';

export function getProduct(repo: ProductRepo) {
  return async (id: ProductId) => {
    const p = await repo.byId(id);
    if (p.discontinued) throw new ProductUnavailable(id);
    return p;
  };
}
```

L'adapter implémente le port en parlant à l'API réelle :

```ts
// adapters/http/product-repo.http.ts
import type { ProductRepo } from '@/domain/ports/product-repo';

export const httpProductRepo: ProductRepo = {
  async byId(id) {
    const res = await fetch(`/api/products/${id}`);
    return ProductSchema.parse(await res.json());     // Zod valide à la frontière
  },
  // ...
};
```

Tu **branches** au moment de bootstrap :

```ts
// main.ts
const getProductUseCase = getProduct(httpProductRepo);
```

Le domaine ne sait toujours pas ce qu'est `fetch`. Tu peux le **tester** :

```ts
test('product discontinued throws', async () => {
  const fakeRepo: ProductRepo = {
    byId: async () => ({ id: '1', name: 'X', discontinued: true } as Product),
    search: async () => [],
  };
  await expect(getProduct(fakeRepo)('1')).rejects.toThrow(ProductUnavailable);
});
```

Pas de mock framework, pas de TestBed, pas de DOM. Une fonction prend une interface, on lui en donne une fausse.

## La plus-value frontend (l'angle qui paie)

C'est ici que ça paie, vraiment, côté front :

:::cheatsheet
- title: "Swap d'API sans réécriture"
  desc: "REST aujourd'hui, tRPC demain, GraphQL après-demain ? Tu changes l'adapter. Le domaine et l'UI ne bougent pas."
- title: "Tests métier en millisecondes"
  desc: "Un test sur Cart.add() ou checkout(repo, payment) tourne en Vitest pur. Pas de Karma, pas de DOM, pas de network."
- title: "Cache transparent"
  desc: "Tu intercales un adapter de cache devant l'adapter HTTP, sans toucher au use case. Decorator pattern naturel."
- title: "Offline-first sans refactor"
  desc: "L'adapter HTTP devient un composé : essaie IndexedDB, fallback réseau. L'app ne sait pas, ça marche."
- title: "BFF / SSR partagé"
  desc: "Le même use case tourne côté serveur (RSC, Nuxt server) et côté client. L'adapter change selon le runtime."
- title: "Onboarding du métier"
  desc: "Un nouveau dev lit application/ et comprend les flux sans avoir à connaître REST, le framework UI ou la base."
:::

## Le rendre concret côté frontend (sans religion)

L'erreur courante : copier la structure verbatim d'un blog backend (folders `domain/entities/`, `application/use-cases/`, `infrastructure/repositories/`, etc.). Pour une app frontend, **trois couches suffisent** :

```text
src/
├── domain/             # types + règles, neutre
│   ├── product.ts
│   ├── cart.ts
│   └── ports/          # interfaces (ProductRepo, CartStorage, ...)
├── application/        # use cases
│   ├── get-product.ts
│   ├── add-to-cart.ts
│   └── checkout.ts
└── adapters/
    ├── http/           # implémentations REST/tRPC
    ├── storage/        # localStorage, IndexedDB
    └── ui/             # composants Angular/React/Vue
```

L'UI consomme les **use cases**, pas les adapters directement. Le composant `<ProductPage>` appelle `getProduct(id)`, il ne sait pas qu'il y a un `fetch` derrière.

## Combiner avec un framework UI

Le piège : croire que « pur » veut dire « pas de framework ». Le framework reste, il vit dans la couche `adapters/ui/`. Mais le **state qui compte** est dans le domaine.

```ts
// adapters/ui/components/cart-view.tsx (React) — l'UI consomme l'app
import { useCart } from '@/adapters/ui/state/use-cart';

export function CartView() {
  const { items, total, add } = useCart();        // expose les use cases
  return /* ... */;
}
```

```ts
// adapters/ui/state/use-cart.ts — l'adapter UI qui rend les use cases réactifs
import { addToCart } from '@/application/add-to-cart';

export function useCart() {
  const cart = useSignal(Cart.empty());
  return {
    items: computed(() => cart().items),
    total: computed(() => cart().total()),
    add: (item: LineItem) => cart.set(addToCart(cart(), item)),
  };
}
```

L'**état immutable du domaine** est wrappé par la **réactivité du framework**. Le use case `addToCart` ne sait pas qu'il existe des signals — il prend un cart et un item, renvoie un cart.

## Quand c'est trop, quand c'est juste

:::callout{type="warn"}
**Trop pour une app à un sujet.** Si tu fais un dashboard d'admin avec une seule API et trois écrans, l'hexagonal est de l'over-engineering. Trois couches dans `src/` (UI, domain, data) suffisent — voir [foundations](/architecture/junior/foundations).

**Juste pour les apps qui survivent.** L'hexagonal paie quand : (1) l'app a plusieurs sujets, (2) l'API évolue ou peut évoluer, (3) tu veux que les règles métier survivent à 2-3 refontes UI, (4) tu fais du SSR + client avec partage de logique.
:::

## Anti-patterns

:::callout{type="warn"}
- **Adapter qui appelle l'UI** — un adapter qui dispatche dans le Redux store ou met à jour un signal global. L'adapter implémente un port, point. C'est le use case qui décide quoi faire du résultat.
- **Use case qui parle à fetch** — pas de I/O dans `application/`. Tout I/O passe par un port.
- **Domain qui importe Zod, React, fetch** — le domaine est neutre. Zod vit côté adapter (validation à la frontière). Pas dans `Cart.ts`.
- **Test d'un use case qui monte un composant** — non. Le use case est testé en pur, avec un faux adapter. Le composant est testé séparément.
- **Mille interfaces pour rien** — si une chose n'a qu'une implémentation et n'en aura jamais d'autre, l'interface est du bruit. Crée des ports **quand** tu vois deux impls ou un besoin de test.
:::

## À retenir

:::cheatsheet
- title: "Cœur sans dépendances externes"
  desc: "domain/ et application/ n'importent ni fetch, ni framework, ni DOM."
- title: "Ports = interfaces sortantes"
  desc: "Le use case déclare ce dont il a besoin (ProductRepo), pas comment ça marche."
- title: "Adapters = impls concrètes"
  desc: "HTTP, localStorage, Angular/React/Vue. Implémentent les ports."
- title: "Dépendances vers le centre"
  desc: "UI dépend d'application, application dépend de domain. Jamais l'inverse."
- title: "Swap = changement d'adapter"
  desc: "REST → tRPC → GraphQL : nouvel adapter, rien d'autre ne bouge."
- title: "Trois couches en frontend"
  desc: "domain/, application/, adapters/. Pas besoin de 7 dossiers."
:::
