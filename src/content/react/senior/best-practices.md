---
title: "Best practices React 2026"
slug: "best-practices"
framework: "react"
level: "senior"
order: 8
duration: 18
prerequisites: ["hooks-rules", "concurrent-features", "compiler"]
updated: 2026-06-01
seoTitle: "Best practices React 2026 — Compiler, RSC, hooks discipline, perf, a11y"
seoDescription: "Les habitudes qui tiennent à l'échelle en React 2026 : Compiler activé, frontières serveur/client claires, hooks disciplinés, state colocalisé, suspense par dépendance, tests pragmatiques, accessibilité et anti-patterns."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "best-practices" }
  - { framework: "vue", slug: "best-practices" }
---

React en 2026 n'est plus le React 2020 où on optimisait à la main avec `useMemo`/`useCallback`. Le **Compiler** est stable, **RSC** est mainstream, **`useEffect`** a quasi disparu des composants bien écrits. Les *best practices* qui tiennent partent de là : laisser le compilateur faire ce qu'il sait faire, et garder une grammaire **explicite** côté serveur/client.

## Nommage

- **Composants** en `PascalCase`. Fichier : `UserCard.tsx`. Un composant = un fichier (sauf composants privés au composant parent, gardés dans le même fichier).
- **Hooks custom** préfixés `use` (`useDebounced`, `useCart`). Si tu ne préfixes pas, ce n'est pas un hook — c'est une fonction.
- **Booléens** : `isPending`, `hasError`, `canSubmit`. Pas de `loading: 'idle' | 'loading' | 'success'` qui réimplémente la machine à états — utilise `useTransition` ou Suspense, ils existent pour ça.
- **Server / Client** : pas de suffixe `.server.tsx` ou `.client.tsx` (Next l'a abandonné). La directive `'use client'` en tête de fichier suffit.

## Compiler activé, point

Active **React Compiler** dans le build. Tu peux dès lors **arrêter d'écrire `useMemo` et `useCallback`** sauf pour les rares cas que le compilateur n'optimise pas (référence d'un setter externe par exemple). Le code est plus lisible, et la mémoïsation correcte est gratuite.

```ts
// Avec Compiler activé, ceci est déjà mémoïsé — pas besoin de useMemo
const filtered = items.filter((i) => i.tags.includes(tag));
const handler = (id: string) => removeItem(id);
```

**Pourquoi.** Le `useMemo` à la main, c'était une dette : on en mettait trop (mémoïser une chaîne est plus cher que la recréer), ou trop peu (le bug invisible). Le compilateur arbitre.

## Frontières serveur / client claires

Le défaut est **serveur**. Tu pousses `'use client'` sur les **feuilles interactives** uniquement.

:::compare
::bad
```tsx
// app/cart/page.tsx
'use client';                       // ← tout le sous-arbre devient client
export default function Cart() {
  // gros composant qui fetch + affiche + interactivité
}
```
::
::good
```tsx
// app/cart/page.tsx — Server Component
export default async function Cart() {
  const items = await getCart();
  return (
    <CartLayout>
      {items.map((i) => <CartLine key={i.id} item={i} />)}
      <CheckoutButton total={total(items)} />  {/* ← seul "use client" */}
    </CartLayout>
  );
}
```
::
:::

**Pourquoi.** RSC évite d'envoyer le JS pour ce qui ne fait que rendre. Le composant `CartLine` n'a pas besoin d'être client — il affiche, c'est tout. Seul `CheckoutButton` (qui a un `onClick`) traverse la frontière.

## State : colocaliser, dériver

Trois règles :
1. **Colocalise** — le state vit au plus proche de qui le lit. Tu *remontes* quand un cousin a besoin de lire, pas avant.
2. **Dérive** — si une valeur peut se calculer depuis d'autres, ne la stocke pas. `total = items.reduce(...)`, pas un `useState(0)` synchronisé à la main.
3. **Une source par sujet** — pour le state serveur, **TanStack Query** (ou équivalent). Pour le state d'UI, `useState`. Pour le state d'URL, le routeur. Pas de Redux pour la couleur d'un bouton hover.

## Hooks : la discipline

- **Rules of hooks** non négociables (pas de hook dans une condition, niveau top du composant uniquement)
- **`useEffect` en dernier recours** — il sert à synchroniser avec un système **externe à React** (browser API, lib non-React). Pour dériver, transformer, calculer : code normal, pas effect.
- **Dépendances honnêtes** — le compilateur ESLint te dit ce qu'il faut. Pas de `// eslint-disable-next-line react-hooks/exhaustive-deps`. Si la dep change trop, c'est un signal de design.
- **`useEvent` / `useEffectEvent`** pour les handlers qui voient l'état frais sans entrer dans les deps. Disponible depuis 19.2.

## Async : Suspense par dépendance

Une `<Suspense>` boundary **par dépendance** indépendante. Skeleton avec les **bonnes dimensions** (sinon CLS).

```tsx
<Page>
  <Suspense fallback={<HeaderSkeleton />}>
    <Header />
  </Suspense>
  <Suspense fallback={<FeedSkeleton />}>
    <Feed />          {/* fetch en parallèle de Header */}
  </Suspense>
</Page>
```

`use()` côté client pour transformer une promesse en valeur synchrone — voir le module [concurrent-features](/react/medior/concurrent-features).

## Tests : Testing Library, pas Enzyme

- **`@testing-library/react`** : tu testes ce que l'utilisateur voit (`getByRole`, `getByLabelText`), pas l'arbre interne
- **Vitest** comme runner (rapide, ESM natif)
- Pas de snapshots de DOM entiers — fragiles, ils cassent au premier renommage
- **MSW** pour mocker les requêtes au niveau réseau (testé en réalité, pas en simulé)

## Accessibilité par défaut

- Sémantique HTML d'abord, ARIA en dernier
- `<button type="button">` (pas `type="submit"` par défaut quand ce n'est pas un submit)
- Form labels associés (`<label htmlFor>` ou wrap)
- Focus management dans les modales (focus-trap, retour au déclencheur à la fermeture)
- `prefers-reduced-motion` respecté pour les animations

## Performance : ce qui paie vraiment

:::cheatsheet
- title: "Compiler activé"
  desc: "Le seul levier de mémoïsation. Plus de useMemo/useCallback manuels."
- title: "RSC pour ce qui rend"
  desc: "Pousser use client aux feuilles interactives ; tout le reste reste serveur."
- title: "Streaming + Suspense"
  desc: "Une boundary par dépendance, skeletons aux bonnes dimensions."
- title: "TanStack Query pour le serveur"
  desc: "Cache, dédup, invalidation. Pas de Redux pour ça."
- title: "import() dynamique"
  desc: "Lazy split de route et des panneaux lourds (éditeur, graph, map)."
- title: "Pas de key={index}"
  desc: "Une clé stable, qui dérive de l'item. Sinon le diff casse à l'insertion."
:::

## Anti-patterns

:::callout{type="warn"}
- **`useEffect` pour dériver** — fait au render, sans effect.
- **`'use client'` au sommet de l'app** — tu perds tout l'intérêt de RSC.
- **Un Provider pour tout** — passe par les routes/layouts ; un provider ne sert qu'à partager un état réellement transverse.
- **`useState` pour des données serveur** — utilise TanStack Query ; la cache et l'invalidation existent.
- **Snapshots de composants** — fragile et inutilisable en revue.
- **`any` ou des `interface Props {}` génériques sans types** — TS perd la main, l'IDE aussi.
:::

## À retenir

:::cheatsheet
- title: "Compiler ON"
  desc: "Plus de useMemo/useCallback manuels. Le code redevient lisible."
- title: "Server-first"
  desc: "Défaut serveur ; 'use client' uniquement sur les feuilles interactives."
- title: "Dérive, ne stocke pas"
  desc: "Une valeur calculable n'a pas sa place dans useState."
- title: "Source par sujet"
  desc: "Serveur = Query, UI = useState, URL = routeur. Pas de Redux pour tout."
- title: "useEffect = synchroniser l'externe"
  desc: "Dériver, transformer, calculer = code normal."
- title: "Suspense par dépendance"
  desc: "Une boundary par fetch indépendant ; skeletons dimensionnés."
:::
