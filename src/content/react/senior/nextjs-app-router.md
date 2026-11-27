---
title: "Next.js App Router : le modèle complet, de la route au déploiement"
slug: "nextjs-app-router"
framework: "react"
level: "senior"
order: 11
duration: 18
prerequisites: ["rsc", "streaming-ssr"]
updated: 2026-11-27
seoTitle: "Next.js App Router — routes, rendu, proxy.ts et déploiement avec Next.js 16"
seoDescription: "Le modèle complet de l'App Router fin 2026 : conventions de fichiers, frontière serveur/client, rendu dynamique par défaut avec Cache Components, proxy.ts, route handlers, root params, catchError, Turbopack et Adapter API. Avec les critères pour lui préférer TanStack Start ou React Router."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "cache-components" }
  - { framework: "react", slug: "rsc-security" }
  - { framework: "react", slug: "tanstack-start" }
  - { framework: "react", slug: "routing" }
---

Tu as vu les [Server Components](/react/senior/rsc), le
[streaming](/react/senior/streaming-ssr) et les
[Cache Components](/react/senior/cache-components) brique par brique. Il manque le
plan d'ensemble : comment Next.js les assemble en un routeur, où s'exécute chaque
fichier, et ce à quoi tu t'engages en le choisissant.

Le moment est bon : l'App Router de fin 2026 n'est plus celui de 2023. Next.js
16.4 (6 octobre 2026) recommande Cache Components pour toutes les apps et
l'annonce comme défaut de Next.js 17. `middleware` s'appelle `proxy`, Turbopack est
le bundler par défaut, et une Adapter API publique encadre le déploiement.

## Le routeur : un arbre de dossiers

Dans `app/`, chaque dossier est un segment d'URL. Un segment ne devient public
que s'il contient un `page.tsx` (une UI) ou un `route.ts` (un endpoint) : tes
composants et tes tests peuvent vivre à côté sans être exposés.

```text
app/
├── layout.tsx                 # layout racine : <html> et <body>
├── (marketing)/page.tsx       # route group : l'URL reste /
├── api/webhooks/route.ts      # route handler : pas d'UI, une réponse HTTP
└── (app)/dashboard/
    ├── layout.tsx             # reçoit children ET le slot modal
    ├── page.tsx               # /dashboard
    ├── loading.tsx            # frontière Suspense du segment
    ├── error.tsx              # error boundary du segment
    ├── photos/[id]/page.tsx   # /dashboard/photos/42, page complète
    └── @modal/                # slot : route parallèle
        ├── default.tsx        # repli du slot après un chargement complet
        └── (.)photos/[id]/page.tsx   # la même URL, interceptée en modale
```

Next.js imbrique ces fichiers dans un ordre fixe : `layout`, `template`, `error`,
`loading`, `not-found`, puis `page`. Donc un `error.tsx` n'attrape pas les erreurs
du `layout` de son propre segment : il est rendu dedans. Et un layout ne se rerend
pas à la navigation : il garde son état, mais n'a pas accès aux `searchParams`.

- **Route group `(nom)`** : range les routes par domaine et autorise plusieurs
  layouts racine. Piège : passer d'un layout racine à un autre recharge la page.
- **Route parallèle `@slot`** : le layout parent reçoit le slot en prop, à côté de
  `children`. Prévois un `default.tsx` : après un chargement complet, Next.js ne
  sait plus ce que le slot affichait, et sans ce fichier c'est une erreur.
- **Route interceptée `(.)`, `(..)`, `(...)`** : en navigation client, la photo
  s'ouvre dans `@modal` par-dessus le dashboard ; en accès direct, la page complète
  se rend. Une modale partageable par URL, sans état client à synchroniser.

Les types suivent l'arbre : `PageProps<'/dashboard/photos/[id]'>`, `LayoutProps`
et `RouteContext` sont des helpers globaux générés par `next dev`, `next build` ou
`next typegen`. `params` et `searchParams` sont des promesses : retiens-le.

## Où s'exécute quoi

Le [modèle RSC](/react/senior/rsc) fixe la règle : serveur par défaut,
`'use client'` pour ouvrir un îlot interactif. Troisième acteur, la **Server
Function** : une fonction async marquée `'use server'`, que le client appelle par
le réseau. En `action` de formulaire, c'est une Server Action (voir
[Actions](/react/medior/actions-forms)). Trois propriétés pèsent sur ton code :

- **Un endpoint public.** Une Server Function est joignable par un POST direct,
  pas seulement depuis ton UI. L'autorisation se vérifie *dans* chaque fonction :
  vois [Sécurité des Server Components](/react/senior/rsc-security).
- **Un seul aller-retour.** La réponse d'une action transporte le résultat et
  l'UI à jour. Pour invalider une donnée cachée : `updateTag(tag)` dans l'action,
  `revalidateTag(tag, 'max')` ailleurs (sa forme à un argument est dépréciée).
- **Un envoi séquentiel.** Le client envoie les actions une par une : la deuxième
  attend la première. Un `Promise.all` de Server Actions ne parallélise rien ;
  regroupe le travail dans une action, ou lis en parallèle côté serveur.

## Données et rendu : dynamique par défaut

Avec `cacheComponents: true` et `partialPrefetching: true` dans `next.config.ts`
(les réglages recommandés de `create-next-app` les activent depuis la 16.4), il
n'y a plus de cache implicite. Next.js classe chaque morceau de la page :

- **statique** : aucune donnée, prérendu automatiquement ;
- **caché** : marqué `'use cache'`, il entre dans le shell prérendu (tout le
  détail est dans [Cache Components](/react/senior/cache-components)) ;
- **à la requête** : `fetch` non caché, `cookies()`, `headers()`, `searchParams`.
  Ce contenu **doit** vivre sous un `<Suspense>`.

Le shell part tout de suite, le reste arrive en streaming. Oublie la frontière,
et Next.js le signale au lieu de basculer la route en dynamique en silence
(insight `blocking-route` en dev, erreur au build). Cas typique : les `params`.

:::compare
::bad
```tsx
// app/blog/[slug]/page.tsx — await en tête : toute la page attend la requête
export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  return <Post slug={slug} />;
}
```
::
::good
```tsx
// La promesse descend : le shell (layouts + fallback) est prérendu
export default function Page({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const { slug } = await params;
  return <Post slug={slug} />;
}
```
::
:::

**Pourquoi.** Sans `generateStaticParams`, `slug` n'existe qu'à la requête.
L'attendre en haut de la page la suspend en entier : rien d'elle n'entre dans le
shell. Passer la promesse vers le bas déplace l'attente sous la frontière, et le
premier visiteur d'une URL jamais vue reçoit quand même un shell instantané.

Ce modèle remplace les configs de segment, et le guide de migration est direct :
`dynamic = 'force-dynamic'` et `fetchCache` se suppriment, `revalidate` devient un
`cacheLife` posé sur la donnée, l'export `runtime` disparaît (Cache Components
exige le runtime Node.js, et `runtime = 'edge'` est déprécié).

Deux effets de bord. `loading.tsx` ne couvre pas le layout de son propre
segment : une lecture non cachée dans un layout réclame son `<Suspense>`. Et la
navigation garde les routes quittées dans un [`<Activity>`](/react/medior/activity)
caché : l'état survit au retour arrière, les effets sont nettoyés puis recréés.

## Autour du rendu : proxy, route handlers, root params, catchError

Avant le rendu, la requête traverse le proxy, l'ancien middleware :

```ts
// proxy.ts — à la racine du projet (ou dans src/), un seul par projet
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
```

**Pourquoi.** Depuis la 16.0, `middleware` est déprécié et renommé (codemod :
`npx @next/codemod@canary middleware-to-proxy .`). Le proxy tourne sur le runtime
Node.js, sans option `runtime`. Le nom dit l'intention : une frontière réseau
*devant* l'app, à utiliser en dernier recours. Redirections, réécritures, contrôle
**optimiste** (le cookie existe-t-il ?) : oui. Requête lente ou seule vérification
d'autorisation : non. `'use cache'` et `'use server'` n'y ont aucun effet, et sans
`matcher` il s'exécute sur toutes les requêtes, `_next/static` compris.

**Route handlers.** Un `route.ts` exporte une fonction par méthode HTTP (`GET`,
`POST`…) sur les `Request` et `Response` du web ; son second argument se type avec
`RouteContext<'/users/[id]'>`. Réserve-le à ce qui n'est pas ton UI : webhooks,
API pour clients tiers, flux RSS. Pour ta propre interface, un Server Component
lit la donnée et une Server Function la modifie : passer par ton handler ajoute
un saut réseau. Avec Cache Components, un `GET` se prérend comme une page.

**Root params** (16.3, 3 août 2026). Ils exposent les segments dynamiques placés
au-dessus du layout racine : avec `app/[lang]/layout.tsx`, tu écris
`import { lang } from 'next/root-params'` puis `await lang()` dans n'importe quel
Server Component, même sous `'use cache'`. Pas dans un Client Component, ni (pour
l'instant) dans une Server Action ou un route handler.

**`catchError`** (stable en 16.3, depuis `next/error`) crée une error boundary
posable n'importe où, là où `error.tsx` reste lié à un segment. Dans un fichier
`'use client'`, `catchError(Fallback)` renvoie le composant frontière, et
`Fallback` reçoit `(props, { error, retry })`. Une boundary écrite à la main ne
réinitialise que l'état client et intercepte les erreurs spéciales de
`redirect()` et `notFound()`. `catchError` les laisse passer, et `retry()` relance
le rendu des enfants, Server Components compris. `error.tsx` reçoit la même prop.

## Outillage et déploiement

**Turbopack** est le bundler par défaut depuis la 16.0, en dev comme au build
(`--webpack` pour revenir en arrière). Le critère de migration : il exécute les
loaders webpack, pas les plugins, et ignore la fonction `webpack()` de
`next.config`. Le [React Compiler](/react/senior/compiler) s'active avec
`reactCompiler: true` et le paquet `babel-plugin-react-compiler`. Depuis la 16.3,
`next build` peut vérifier les types avec TypeScript 7.

Pour déployer, quatre voies. `next start` sur un **serveur Node.js**, ou dans
**Docker** avec `output: "standalone"` : tout fonctionne. L'**export statique** va
partout, sans ce qui demande un serveur. Enfin un **adaptateur** : l'Adapter API
est stable depuis la 16.2 (mars 2026). Il se déclare avec `adapterPath`, implémente
`modifyConfig` et `onBuildComplete`, et reçoit une description typée du build.

Le changement est aussi politique : l'adaptateur de Vercel passe par ce contrat
public, et la suite de tests de compatibilité est ouverte. La doc liste deux
adaptateurs vérifiés, Vercel et Bun ; Cloudflare et Netlify préparent le leur.
Hors Vercel, le vrai coût arrive avec la deuxième instance : le cache par défaut
est local à chaque serveur. Il te faut un handler partagé (`cacheHandlers`,
`'use cache: remote'`) et un `deploymentId` contre les décalages de version.

## Horizon Next 17, et quand choisir autre chose

Ce qui est écrit : Cache Components devient le défaut de Next.js 17, et la doc
annonce le retrait des options `cacheComponents` et `partialPrefetching` à la
prochaine majeure. `middleware` et le runtime Edge sont dépréciés. Sur la 16,
active donc les deux options, supprime les configs de segment et migre le proxy.

:::callout{type="warn"}
**Statuts en novembre 2026.** Next.js 17 n'est pas sorti, et le billet 16.4 ne
donne pas de date ; sur npm, `latest` vaut 16.4.6 et une préversion
`16.5.0-preview.0` date du 26 novembre. Le portage Rust du React Compiler
(`experimental.turbopackRustReactCompiler`) est expérimental. Les RSC restent
instables dans React Router (API `unstable_`), expérimentaux dans TanStack Start.
:::

Reste à savoir si Next.js est le bon choix :

- **Next.js** : des RSC stables au cœur du framework, un shell prérendu et du
  streaming sans plomberie. En échange : des conventions fortes, et un modèle de
  cache qui a bougé en 15 puis changé de fond en comble en 16.
- **[TanStack Start](/react/senior/tanstack-start)** : app surtout interactive,
  état dans l'URL, typage de bout en bout. Tu renonces aux RSC de première classe.
- **React Router** (8.5 en novembre 2026) : loader/action sur Vite, migration par
  étapes depuis une SPA ou Remix. Vois [Routing](/react/medior/routing) et le
  comparatif [Stratégies de rendu](/compare/rendering-strategies).

## À retenir

:::cheatsheet
- title: "Arbre de dossiers"
  desc: "page.tsx ou route.ts rend un segment public. Ordre fixe : layout, template, error, loading, not-found, page. (groupe), @slot + default.tsx, (.) pour intercepter."
- title: "Dynamique par défaut"
  desc: "cacheComponents + partialPrefetching : statique automatique, 'use cache' dans le shell, lecture à la requête sous <Suspense>. params et searchParams sont des promesses."
- title: "Deux portes d'entrée réseau"
  desc: "proxy.ts (ex-middleware, runtime Node.js) : redirections et contrôle optimiste, jamais ta seule autorisation. Server Function : endpoint POST public, à autoriser dans chaque fonction."
- title: "Root params et catchError (16.3)"
  desc: "next/root-params lit [lang] depuis tout Server Component. catchError (next/error) crée une error boundary dont retry() rerend aussi les Server Components."
- title: "Déploiement"
  desc: "next start ou Docker : tout fonctionne. Adapter API stable depuis la 16.2 (adapterPath). En multi-instances : cache partagé et deploymentId."
:::
