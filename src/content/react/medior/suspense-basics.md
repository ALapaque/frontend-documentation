---
title: "Suspense"
slug: "suspense-basics"
framework: "react"
level: "medior"
order: 4
duration: 15
prerequisites: ["effects-basics", "server-state"]
updated: 2026-05-22
seoTitle: "Suspense — react"
seoDescription: "Suspense déclare des frontières de chargement : un composant suspend pendant qu'une donnée arrive, le fallback s'affiche, l'Error boundary attrape l'échec. Intégration libs et RSC."
ogVariant: "gold"
related:
  - framework: "vue"
    slug: "composables"
  - framework: "angular"
    slug: "defer-lazy"
---

`Suspense` n'est pas un fetcher. C'est une frontière déclarative qui dit à React : « si un composant en dessous n'est pas prêt, affiche ce fallback à sa place, et ne casse rien autour ». Le composant signale qu'il n'est pas prêt en *suspendant* : il jette une promesse. React attrape ça, montre le fallback, puis re-rend quand la promesse résout.

## La frontière, le fallback, l'erreur

Trois responsabilités séparées : `<Suspense>` gère l'état de chargement, une `ErrorBoundary` gère l'échec, le composant gère le succès. Aucun `isLoading` ni `error` ne pollue le rendu nominal.

```tsx
<ErrorBoundary fallback={<Erreur />}>
  <Suspense fallback={<Skeleton />}>
    <Profil userId={id} />
  </Suspense>
</ErrorBoundary>
```

`Profil` n'a qu'un seul chemin de code : celui où la donnée existe. Quand il suspend, le `Skeleton` apparaît ; quand il jette, l'`ErrorBoundary` prend le relais. Les boundaries sont composables et imbricables : on isole une carte sans bloquer le reste de la page.

## Qui sait suspendre

Un composant ne suspend pas tout seul. Il faut une source qui jette une promesse non résolue : `use(promise)` (React 19), un cache de data fetching, ou une lib qui implémente le protocole.

```tsx
function Profil({ userId }: { userId: string }) {
  // userPromise vient d'un loader/cache, pas créée dans le rendu
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}
```

:::callout{type="warn"}
Ne crée jamais la promesse dans le corps du composant (`use(fetch(...))` à chaque rendu). Une nouvelle promesse à chaque rendu = boucle de suspension infinie. La promesse doit être stable : fournie par un loader de router, un cache (TanStack Query, `cache()` RSC) ou un état parent.
:::

## Suspense côté data : compare

:::compare
::bad
```tsx
function Profil({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch(`/u/${id}`).then(r => r.json())
      .then(setUser).catch(setError)
      .finally(() => setLoading(false));
  }, [id]);
  if (loading) return <Skeleton />;
  if (error) return <Erreur />;
  return <h1>{user.name}</h1>;
}
```
::
::good
```tsx
function Profil({ id }) {
  const user = use(getUser(id)); // promesse cachée et stable
  return <h1>{user.name}</h1>;
}
// rendu par <ErrorBoundary><Suspense fallback={<Skeleton/>}>
```
::
:::

**Pourquoi** : la version `useEffect` couple trois états dans le composant et déclenche le fetch *après* le premier rendu (effet post-paint), d'où un flash et un waterfall si plusieurs composants imbriqués font pareil. Surtout, l'état de chargement est local et non coordonnable : impossible de regrouper plusieurs chargements sous un même fallback. La version Suspense sort le chargement et l'erreur de l'arbre de rendu et les confie à des frontières. React peut alors *batcher* les suspensions sœurs sous un seul fallback, démarrer le fetch au moment du rendu (voire pendant le SSR streaming), et garder le composant pur. C'est un changement de mécanisme : on déclare une frontière au lieu de gérer un automate d'états à la main.

## Idée reçue : « Suspense, c'est React qui fetch pour moi »

Faux. Suspense ne sait rien faire de réseau : il n'a aucune notion de fetch, de cache ou de retry. C'est un *protocole* — un composant jette une promesse, React montre le fallback et réessaie quand elle résout — rien de plus. La donnée, le cache et la déduplication restent entièrement à ta charge ou à celle d'une lib (TanStack Query, `use()` sur une promesse cachée, RSC `async`). Croire que Suspense « gère le data fetching » mène droit au piège de la promesse créée dans le rendu : sans source qui stabilise et met en cache la promesse, tu boucles. Suspense orchestre l'*affichage* de l'état de chargement ; il ne charge rien.

## Intégration : libs et RSC

Les libs de server state exposent un mode Suspense (`useSuspenseQuery` chez TanStack Query) : la query suspend au lieu de retourner `isLoading`. Côté RSC, un composant serveur `async` *est* déjà suspendable : `await` dans le composant, frontière `<Suspense>` côté parent, et le SSR streame le fallback puis le contenu (voir `streaming-ssr`).

## À retenir

:::cheatsheet
- title: "Frontière, pas fetcher"
  desc: "Suspense déclare un fallback ; c'est la source de données qui suspend en jetant une promesse."
- title: "Trois rôles séparés"
  desc: "Suspense = loading, ErrorBoundary = échec, composant = succès (un seul chemin)."
- title: "Promesse stable"
  desc: "Jamais créée dans le rendu ; vient d'un cache, loader ou use()."
- title: "Coordination"
  desc: "Frontières imbricables : on regroupe ou on isole les chargements."
:::
