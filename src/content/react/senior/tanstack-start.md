---
title: "TanStack Start : le full-stack type-safe"
slug: "tanstack-start"
framework: "react"
level: "senior"
order: 9
duration: 16
prerequisites: ["routing", "server-state"]
updated: 2026-11-27
seoTitle: "TanStack Start — routing type-safe, server functions, streaming SSR"
seoDescription: "TanStack Start monte comme alternative à Next.js : routing 100 % type-safe (TanStack Router), server functions typées bout-en-bout, streaming SSR, et l'intégration native avec TanStack Query. Forces, limites et quand le choisir."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "routing" }
  - { framework: "react", slug: "server-state" }
---

Le full-stack React n'est plus un monopole Next.js. TanStack Start — bâti sur TanStack Router, TanStack Query, Vite et Nitro — a bouclé un long cycle de Release Candidate : la 1.0 stable a été annoncée le 13 octobre 2026. Ce n'est plus un pari expérimental : c'est l'alternative qui monte, portée par un écosystème (Router, Query) déjà massivement adopté.

Son pari central tient en une phrase : le type-safety de bout en bout. Params de route, search params, liens, loaders, appels serveur — tout passe par le compilateur TypeScript, sans codegen. En échange, les RSC ne sont pas le cœur du modèle : Start assume par défaut un SSR classique + hydratation, avec un RPC typé par-dessus. Les Server Components existent, mais en option expérimentale.

## Le pari : tout est typé

TanStack Router traite l'URL comme de l'état applicatif à part entière. Les params sont inférés depuis le chemin du fichier, et les search params sont validés par un schéma — plus jamais de `useSearchParams()` qui renvoie des `string | null` à parser à la main.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  page: z.number().int().min(1).default(1),
  tri: z.enum(["prix", "date"]).default("date"),
});

export const Route = createFileRoute("/produits/$categorie")({
  validateSearch: searchSchema,
  component: PageProduits,
});

function PageProduits() {
  const { categorie } = Route.useParams(); // string, garanti présent
  const { page, tri } = Route.useSearch(); // number, "prix" | "date"
  return <Catalogue categorie={categorie} page={page} tri={tri} />;
}
```

**Pourquoi.** Le schéma `validateSearch` fait deux choses à la fois : il valide à l'exécution (une URL trafiquée retombe sur les valeurs par défaut au lieu de faire planter le rendu) et il fournit le type statique de `Route.useSearch()`. L'URL devient une source d'état aussi fiable qu'un store — sérialisable, partageable, typée. C'est la différence de philosophie avec un routeur à conventions : ici, rien n'est `any`.

Ce typage s'étend à la navigation. Un lien vers une route inexistante ou avec un param manquant est une erreur de compilation, pas un 404 découvert en prod.

:::compare
::bad
```tsx
// Chaîne construite à la main : rien ne vérifie la route ni les params
<a href={`/produits/${cat}?page=${page}`}>Voir</a>;
navigate(`/produts/${cat}`); // typo silencieuse → 404 en prod
```
::
::good
```tsx
// Link typé : route, params et search vérifiés à la compilation
<Link
  to="/produits/$categorie"
  params={{ categorie: cat }}
  search={{ page: 2, tri: "date" }} // validé contre le schéma Zod
>
  Voir
</Link>
```
::
:::

## Server functions : du RPC typé

`createServerFn` te laisse appeler du code serveur comme une fonction locale. Le code du `handler` est extrait du bundle client au build (Vite) ; côté client, il ne reste qu'un stub `fetch` typé. Les types traversent la frontière réseau sans codegen, parce que client et serveur vivent dans le même programme TypeScript.

```tsx
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const creerCommande = createServerFn({ method: "POST" })
  .validator(z.object({ produitId: z.string(), quantite: z.number().min(1) }))
  .handler(async ({ data }) => {
    // s'exécute uniquement côté serveur : DB, secrets, etc.
    const commande = await db.commandes.create({ data });
    return { id: commande.id }; // type inféré côté client
  });

// Côté client : une mutation TanStack Query classique
const mutation = useMutation({
  mutationFn: (input: { produitId: string; quantite: number }) =>
    creerCommande({ data: input }),
});
```

**Pourquoi.** Le `.validator()` n'est pas décoratif : c'est la frontière réseau. Tout ce qui arrive du client est hostile par définition, et le schéma Zod garantit à l'exécution ce que TypeScript promet à la compilation. L'approche diffère des Server Actions React : là où `'use server'` est une directive de compilateur liée au modèle RSC, `createServerFn` est un RPC explicite — une fonction que tu importes, appelles depuis un composant, un loader ou une autre server function, en GET ou en POST, avec middleware composable. Moins magique, plus traçable.

## Loaders + TanStack Query : le data-fetching intégré

Chaque route déclare un `loader` qui s'exécute avant le rendu — côté serveur au premier chargement, côté client ensuite. Le pattern canonique : le loader amorce le cache Query, le composant lit avec `useSuspenseQuery`.

```tsx
export const Route = createFileRoute("/produits/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(produitOptions(params.id)),
  component: PageProduit,
});

function PageProduit() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(produitOptions(id)); // jamais undefined
  return <Fiche produit={data} />;
}
```

**Pourquoi.** Le loader garantit que la donnée est là avant le rendu (zéro waterfall, zéro spinner au premier paint), et Query garde la main sur le cycle de vie : cache partagé, invalidation après mutation, refetch en arrière-plan. Le SSR streaming est pris en charge nativement : les données résolues côté serveur sont déshydratées dans le flux HTML et réhydratées dans le cache client, y compris pour les requêtes qui résolvent après le shell.

:::callout{type="tip"}
Active `defaultPreload: "intent"` sur le routeur : au survol d'un `Link`, Start précharge le code de la route et exécute son loader. La navigation paraît instantanée sans que tu écrives une ligne de préchargement.
:::

## Ce qui reste jeune (l'honnêteté)

Les React Server Components sont là, mais en opt-in expérimental. Par défaut, tous tes composants sont expédiés au client et hydratés — le modèle « SSR classique + hydratation ». Sur une page très riche en contenu statique, tu embarques du JS que Next avec RSC n'enverrait pas. Pour l'éviter, tu actives les RSC toi-même : `@vitejs/plugin-rsc` avec Vite 8+ (ou Rsbuild 2+, sans plugin séparé), puis `rsc: { enabled: true }` dans le plugin `tanstackStart`. Tu rends alors tes composants serveur depuis une server function, avec `renderServerComponent` ou `createCompositeComponent`. En novembre 2026, la doc officielle les marque encore « experimental » et prévient que l'API peut bouger — vérifie-la avant d'en faire un critère.

L'écosystème est aussi plus jeune. Moins de guides, moins de réponses sur les cas tordus, moins d'intégrations clé en main (auth, CMS, e-commerce) que dix ans de Next.js. Le déploiement passe par Nitro, qui cible la plupart des plateformes (Node, Vercel, Cloudflare, Netlify…), mais avec moins de chemins balisés.

:::callout{type="warn"}
La 1.0 est récente (13 octobre 2026) : le cœur (Router, Query) est éprouvé depuis des années, mais la couche full-stack a peu de kilométrage en production comparée à Next. Fige tes versions et lis les notes de release avant chaque montée.

Suis aussi les avis de sécurité. La CVE-2026-102989 (XSS réfléchi dans les réponses des server functions, sévérité critique) touche `@tanstack/react-start` de la 1.143.12 à la 1.168.59 : le correctif est dans la 1.168.60, publiée le 30 septembre 2026.
:::

## Quand choisir Start vs Next

Choisis Start quand : ton app est très interactive (dashboard, SaaS, outil métier) où le poids du JS compte moins que la DX ; ton équipe vit déjà dans TanStack Query ; ou l'URL porte beaucoup d'état (filtres, tris, pagination) et tu veux un typage maximal du routing à la donnée.

Choisis Next quand : tu as besoin de RSC stables, au cœur du framework, ou du Partial Prerendering pour réduire le JS sur du contenu massif ; tu veux l'écosystème et l'hébergement Vercel avec ses chemins tout tracés ; ou tu recrutes et la profondeur de documentation prime sur l'élégance du typage. Les deux font du streaming SSR correct — le vrai différenciateur, c'est des RSC de première classe d'un côté, le type-safety bout en bout de l'autre.

## À retenir

:::cheatsheet
- title: "Statut fin 2026"
  desc: "1.0 stable annoncée le 13 octobre 2026 après une longue RC ; cœur Router/Query éprouvé, couche full-stack jeune."
- title: "Routing 100 % typé"
  desc: "createFileRoute + validateSearch : params et search params inférés, Link vérifié à la compilation."
- title: "createServerFn = RPC explicite"
  desc: ".validator() (Zod) à la frontière réseau, .handler() côté serveur, types partagés sans codegen."
- title: "Loader + Query"
  desc: "ensureQueryData dans le loader, useSuspenseQuery dans le composant ; preload \"intent\" au survol."
- title: "RSC en opt-in expérimental"
  desc: "Par défaut, SSR classique + hydratation : tout le JS part au client. RSC activables (@vitejs/plugin-rsc avec Vite 8+, ou Rsbuild 2+), encore expérimentaux en novembre 2026."
:::
