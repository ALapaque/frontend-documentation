---
title: "Server state"
slug: "server-state"
framework: "react"
level: "medior"
order: 6
duration: 19
prerequisites: ["effects-basics"]
updated: 2026-05-22
seoTitle: "Server state avec TanStack Query — Medior React"
seoDescription: "Pourquoi l'état serveur n'est pas de l'état client : cache, invalidation et mutations avec TanStack Query."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "signals-rxjs-interop" }
  - { framework: "vue", slug: "composables" }
---

## L'état serveur est différent

Les données qui viennent d'une API ne t'appartiennent pas : elles peuvent
devenir périmées, être partagées entre composants, nécessiter du retry. Les
gérer avec `useState` + `useEffect` revient à réécrire un mauvais cache.

:::compare
::bad
```tsx
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/user').then((r) => r.json()).then(setData);
}, []); // pas de cache, pas de retry, pas de dédoublonnage
```
::
::good
```tsx
const { data, isPending, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id),
});
```
::
:::

## La clé de requête est le cache

`queryKey` identifie une donnée. Deux composants avec la même clé partagent une
seule requête et un seul cache. Changer la clé déclenche un nouveau fetch.

## Mutations et invalidation

Après une écriture, on **invalide** les clés concernées pour re-synchroniser.

```tsx
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
});
```

:::cheatsheet
- title: "queryKey"
  desc: "Identité de la donnée. Même clé = même cache partagé."
- title: "staleTime"
  desc: "Durée pendant laquelle la donnée est considérée fraîche (pas de refetch)."
- title: "invalidateQueries"
  desc: "Marque des clés comme périmées → refetch à la prochaine utilisation."
:::

:::callout{type="tip"}
Sépare nettement **état serveur** (TanStack Query) et **état client** (useState,
Zustand). Mélanger les deux dans un même store est la source n°1 de bugs de
synchronisation.
:::
