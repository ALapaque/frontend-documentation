---
title: "React Server Components"
slug: "rsc"
framework: "react"
level: "senior"
order: 1
duration: 22
prerequisites: ["server-state"]
updated: 2026-05-22
seoTitle: "React Server Components — modèle mental"
seoDescription: "RSC sans confusion : la frontière client/serveur, ce qui traverse le réseau, et où vit l'état."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

## Deux mondes dans un même arbre

Un Server Component s'exécute **sur le serveur**, à la requête. Il n'est jamais
envoyé au client sous forme de JS : seul son rendu (une description sérialisée)
traverse le réseau. Un Client Component, lui, est hydraté et interactif.

```tsx
// app/page.tsx — Server Component par défaut
async function Page() {
  const posts = await db.post.findMany(); // accès direct à la base
  return <PostList posts={posts} />;
}
```

```tsx
'use client';
// nécessaire dès qu'on a de l'état ou des handlers
export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? '♥' : '♡'}</button>;
}
```

## La règle de la frontière

`'use client'` marque une **frontière**. Tout ce qui descend depuis ce point est
client. Un Server Component peut importer un Client Component, mais l'inverse
n'est pas vrai — il passe par les `children` ou les props.

:::cheatsheet
- title: "Server Component (défaut)"
  desc: "Async, accès aux secrets/DB, zéro JS client. Pas d'état ni de hooks d'effet."
- title: "'use client'"
  desc: "Frontière d'interactivité : useState, useEffect, événements."
- title: "Props sérialisables"
  desc: "Ce qui traverse la frontière doit être sérialisable (pas de fonctions)."
:::

### Idée reçue : « RSC, c'est juste du SSR »

Non. Le SSR rend du HTML puis hydrate **tout** le JS. Les RSC ne renvoient
jamais le code des composants serveur : le bundle client rétrécit. SSR et RSC
sont complémentaires, pas synonymes.

:::callout{type="warn"}
Un Server Component ne peut pas recevoir une fonction en prop (non sérialisable),
sauf une Server Action (`'use server'`). Garde la frontière nette : data vers le
bas, interactivité dans des îlots clients.
:::

## Code source

Le protocole RSC (le « Flight » payload) et le bundler (React Server DOM) sont
documentés dans le dépôt `facebook/react`, paquets `react-server-dom-*`. Lire le
format de payload clarifie ce qui est réellement streamé.
