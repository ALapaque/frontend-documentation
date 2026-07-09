---
title: "Cache Components et 'use cache'"
slug: "cache-components"
framework: "react"
level: "senior"
order: 9
duration: 16
prerequisites: ["rsc"]
updated: 2026-07-09
seoTitle: "React 'use cache' et Cache Components — le cache explicite au niveau du composant"
seoDescription: "La directive 'use cache' marque un composant ou une fonction comme cachable, avec cacheLife et cacheTag pour la durée et l'invalidation. Couplée aux Cache Components de Next.js (successeur de PPR), elle rend le rendu « statique par défaut, dynamique quand il le faut »."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "rsc" }
  - { framework: "react", slug: "streaming-ssr" }
---

Pendant des années, le rendu serveur t'a imposé un choix binaire à la mauvaise
granularité : **la route entière**. Soit statique (SSG) — rapide, mais figée
jusqu'au prochain build —, soit dynamique (SSR) — fraîche, mais recalculée à
chaque requête, donc lente. `'use cache'` et les Cache Components descendent
cette décision au niveau du **composant** : statique par défaut, dynamique là où
c'est nécessaire, dans la même page.

## Le problème : la granularité de la route

Le drame du modèle par route, c'est qu'**une seule** donnée dynamique contamine
tout. Une page produit dont 95 % est identique pour tous (titre, images) mais qui
affiche un stock temps réel bascule la route entière en dynamique. Le shell
statique — celui qu'on servirait depuis un CDN en quelques millisecondes — est
retenu en otage par ce petit îlot qui change.

Tu connais déjà la brique de base : les [Server Components](/react/senior/rsc)
s'exécutent au serveur et ne renvoient qu'une description sérialisée de leur
rendu. Ce qui manquait, c'était un moyen de dire, composant par composant : « ça,
mémoïse-le ; ça, recalcule-le à chaque requête ».

:::callout{type="info"}
Séparons les deux couches. `'use cache'` est **la directive** (une primitive
côté React/Server Components). **Cache Components** est le **cadre** Next.js qui
l'active et orchestre le rendu autour (shell statique + streaming).
:::

## `'use cache'` : marquer une frontière cachable

La directive marque une route, un composant ou une fonction async comme
**cachable** : son résultat est mémoïsé et réutilisé. Tu la poses en tête de
fichier (tous les exports sont cachés) ou en tête d'une fonction/d'un composant.

```tsx
// Niveau composant : on cache le rendu de ce composant
export async function Bookings({ type = 'haircut' }: { type: string }) {
  'use cache'
  const data = await fetch(`/api/bookings?type=${type}`)
  return /* ... */
}

// Niveau fonction : on cache une requête ou un calcul lent
export async function getData() {
  'use cache'
  return fetch('/api/data')
}
```

**Ce qui entre dans la clé de cache** : une version sérialisée des entrées —
l'ID de build (change à chaque build → invalide tout), un hash de la signature de
la fonction, et les **arguments sérialisables** (les props pour un composant, les
arguments pour une fonction). Subtilité vérifiée : les variables capturées depuis
une portée externe (closure) sont automatiquement liées comme arguments, donc
elles entrent aussi dans la clé.

```tsx
async function Component({ userId }: { userId: string }) {
  const getData = async (filter: string) => {
    'use cache'
    // clé = userId (closure) + filter (argument)
    return fetch(`/api/users/${userId}/data?filter=${filter}`)
  }
  return getData('active')
}
```

**Pourquoi** : chaque combinaison distincte d'arguments produit une entrée
distincte. Un argument non sérialisable ne peut pas participer à la clé — d'où
les contraintes plus bas.

## `cacheLife` : durée et fraîcheur

Par défaut, une entrée suit le profil `default` : `stale` 5 min (client),
`revalidate` 15 min (serveur), pas d'expiration par le temps. `cacheLife` change
ce profil, via un nom prédéfini (`'seconds'`, `'minutes'`, `'hours'`, `'days'`,
`'weeks'`, `'max'`) ou un profil custom déclaré dans `next.config`.

```tsx
import { cacheLife } from 'next/cache'

async function getPricing() {
  'use cache'
  cacheLife('hours') // péremption temporelle : profil « hours »
  return fetch('/api/pricing')
}
```

Un profil décrit trois horizons : `stale` (réutilisation client sans revérifier),
`revalidate` (régénération serveur en arrière-plan), `expire` (au-delà, l'entrée
n'est plus servable). C'est du *stale-while-revalidate* : on sert l'ancien
pendant qu'on reconstruit le neuf.

## `cacheTag` et l'invalidation ciblée

Le temps ne suffit pas quand une **mutation** doit rendre une donnée obsolète
tout de suite. `cacheTag` attache des étiquettes à une entrée ; `revalidateTag`
(dans une Server Action) invalide toutes les entrées porteuses de l'étiquette.

```tsx
import { cacheTag } from 'next/cache'

async function getProduct(id: string) {
  'use cache'
  cacheTag('products', `product:${id}`) // étiquette globale + ciblée
  return fetch(`/api/products/${id}`)
}
```

```tsx
'use server'
import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string) {
  await db.products.update(id, /* ... */)
  revalidateTag(`product:${id}`) // n'invalide QUE ce produit
}
```

**Pourquoi** : la granularité de l'étiquette est la granularité de
l'invalidation. `revalidateTag('products')` purge tout le catalogue ;
`revalidateTag('product:abc')` ne touche qu'une fiche.

## Cache Components : statique par défaut, dynamique explicite

Côté Next.js, tout vit sous un seul drapeau, `cacheComponents: true` dans
`next.config`. Ce cadre est le **successeur unifié** de `experimental.ppr`
(Partial Prerendering) et `experimental.dynamicIO` : il les remplace et absorbe
leur comportement. Le PPR est désormais **le défaut** ; `experimental.ppr` et le
segment `experimental_ppr` ont été retirés.

Le modèle mental s'inverse : la donnée est **dynamique par défaut**, et c'est le
cache que tu ajoutes, composant par composant. Next.js prérend un **shell HTML
statique** servi immédiatement, puis **streame** le dynamique dès qu'il est prêt.
La frontière entre les deux, c'est `<Suspense>` : le caché part dans le shell, le
dynamique est enveloppé d'un `<Suspense>` et arrive en flux.

:::compare
::bad
```tsx
// Une seule donnée par-requête → toute la page devient dynamique
export default async function Page() {
  const product = await getProduct()    // cachable, mais...
  const cart = await getCart(cookies()) // par-requête → contamine tout
  return <><Product data={product} /><Cart data={cart} /></>
}
```
::
::good
```tsx
// Shell caché instantané + îlot dynamique streamé
async function Product() {
  'use cache'          // entre dans le shell statique
  cacheLife('hours')
  return /* ... */
}

export default function Page() {
  return (
    <>
      <Product />                        {/* shell, servi tout de suite */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart />                         {/* dynamique, streamé à la requête */}
      </Suspense>
    </>
  )
}
```
::
:::

**Pourquoi** : à gauche, lire les cookies dans le corps de la page force le rendu
dynamique de l'ensemble — l'utilisateur attend la donnée la plus lente avant le
premier octet. À droite, `Product` caché constitue le shell (TTFB = vitesse du
CDN), et `Cart` dynamique remplit son emplacement derrière sa frontière
`<Suspense>`. Même page, deux régimes de fraîcheur.

## Le POURQUOI

L'intérêt n'est pas une API de cache de plus, mais de **composer finement**
fraîcheur et performance dans une seule route, sans les deux vieux compromis :

- **Pas d'opt-in par route.** Fini `export const revalidate = 3600` qui décide
  pour la page entière. La décision descend au composant, là où tu connais la
  volatilité réelle de chaque donnée.
- **Pas de cache réseau opaque.** Le cache est **dans le rendu**, avec une clé
  explicite (arguments) et une invalidation explicite (`cacheTag`). Tu ne débogues
  pas un `Cache-Control` de CDN à distance : tu lis la clé et l'étiquette dans ton
  code.

## Pièges et statut

:::callout{type="warn"}
**Un segment caché ne voit pas la requête.** Interdit d'appeler `cookies()`,
`headers()` ou de lire `searchParams` dans une portée `'use cache'`. Le motif
correct : lire ces valeurs **hors** du cache et les passer en arguments. Un
`Promise` de donnée par-requête traversé dans un segment caché fait *pendre le
build* (timeout ~50 s), car le cache attend une donnée absente au build.

**La sérialisation est stricte.** Arguments et retours doivent être sérialisables
(primitives, objets plats, tableaux, `Date`/`Map`/`Set`) — pas d'instances de
classe ni de fonctions, sauf en *pass-through* (un `children` ou une Server Action
**traversés sans être introspectés** ne faussent pas la clé). À noter : les
arguments utilisent la sérialisation Server Component (plus restrictive), les
retours celle des Client Components — d'où le fait qu'on puisse **retourner** du
JSX mais pas l'**accepter** en argument.

**Statut, honnêtement (mi-2026).** `'use cache'` est apparu en expérimental dans
Next.js 15. Depuis **Next.js 16**, il s'active via le drapeau `cacheComponents`,
qui unifie `ppr` + `useCache` + `dynamicIO`. Le drapeau est stable, mais
l'écosystème bouge encore (profils, `'use cache: remote'`, `'use cache: private'`).
Traite la sémantique fine comme sujette à ajustements, et distingue toujours la
primitive React du cadre Next.js qui l'orchestre.
:::

## À retenir

`'use cache'` marque un composant ou une fonction async comme cachable, avec une
clé dérivée des arguments sérialisables. `cacheLife` gère la péremption
temporelle, `cacheTag` + `revalidateTag` l'invalidation ciblée. Cache Components
(Next.js 16, successeur de PPR/`dynamicIO`) en fait un modèle « statique par
défaut, dynamique explicite », avec `<Suspense>` pour séparer le shell caché du
contenu dynamique streamé.

:::cheatsheet
- title: "'use cache'"
  desc: "Directive en tête de fichier/composant/fonction async : mémoïse le résultat. Clé = build + signature + arguments sérialisables (closures incluses)."
- title: "cacheLife(profil)"
  desc: "Durée/fraîcheur : 'seconds'…'max' ou profil custom. Modèle stale-while-revalidate (stale/revalidate/expire)."
- title: "cacheTag + revalidateTag"
  desc: "Étiquette une entrée puis invalide à la demande depuis une Server Action. Granularité de l'étiquette = granularité de l'invalidation."
- title: "Cache Components (Next.js)"
  desc: "cacheComponents: true. Successeur de PPR/dynamicIO. Shell statique + streaming ; <Suspense> = frontière shell/dynamique."
- title: "Interdit dans un segment caché"
  desc: "cookies()/headers()/searchParams. Lis-les hors cache, passe-les en arguments (sinon build qui pend)."
- title: "React vs Next.js"
  desc: "La directive = primitive (React/RSC). Cache Components = cadre Next.js qui l'active et orchestre le rendu."
:::
